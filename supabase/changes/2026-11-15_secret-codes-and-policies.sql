-- Backend steps 3 + 4: hide secret codes and add security rules (RLS policies).
-- ALREADY APPLIED to the live database on 2026-11-15. Don't run it again
-- (it will fail with "relation cache_secrets already exists" and change nothing).
-- Kept as a record of the change. Original instructions:
-- Run ONCE: Supabase dashboard -> SQL Editor -> New query -> paste this whole
-- file -> Run. Everything is in one transaction: if any line fails, nothing
-- changes.
--
-- What this does, in plain language:
--   1. Moves secret_code out of `caches` into a new `cache_secrets` table that
--      only the cache's creator can read. Finders never see codes.
--   2. Adds database functions the frontend calls with supabase.rpc(...):
--        generate_secret_code()  -> a fresh 6-character code ("New code" button)
--        create_cache(...)       -> saves a cache, its hints, and its code at once
--        log_find(...)           -> checks the code and logs the find
--   3. Adds RLS policies so the frontend can read caches and hints.
--
-- "security definer" means the function runs with the database owner's
-- permissions, so it can read cache_secrets even though users can't. That's
-- why the code check is safe: it happens inside the database, not in the browser.

begin;

-- ---------------------------------------------------------------------------
-- 1. cache_secrets: one secret code per cache, creator-only.
-- Codes are 6 characters, uppercase, never 0, O, 1, I, or L.
-- ---------------------------------------------------------------------------
create table public.cache_secrets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  cache_id uuid not null unique references public.caches(id) on delete cascade,
  secret_code text not null,
  constraint secret_code_format check (secret_code ~ '^[A-HJKMNP-Z2-9]{6}$')
);

-- Copy the existing codes over, then remove the column from caches.
insert into public.cache_secrets (cache_id, secret_code)
select id, upper(secret_code) from public.caches;

alter table public.caches drop column secret_code;

alter table public.cache_secrets enable row level security;

revoke all on public.cache_secrets from anon, authenticated;
grant select on public.cache_secrets to authenticated;

create policy "Creators can see their own cache's code"
  on public.cache_secrets for select to authenticated
  using (
    exists (
      select 1 from public.caches c
      where c.id = cache_secrets.cache_id
        and c.created_by = (select auth.uid())
    )
  );
-- No insert/update/delete policies: codes are only written by create_cache,
-- and they're locked after saving.

-- ---------------------------------------------------------------------------
-- 2a. generate_secret_code(): a random code using the allowed characters.
-- ---------------------------------------------------------------------------
create or replace function public.generate_secret_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text := '';
begin
  for i in 1..6 loop
    code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return code;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2b. create_cache(): saves the cache, up to 3 hints, and the code together.
-- Frontend:
--   const { data, error } = await supabase.rpc('create_cache', {
--     p_title, p_latitude, p_longitude, p_difficulty,
--     p_description, p_location_name, p_hints: ['hint 1', 'hint 2'],
--     p_secret_code,   // optional; leave out to get a random one
--   })
--   // data = { cache_id: '...', secret_code: 'K7MQ2X' }  -> show on success screen
-- ---------------------------------------------------------------------------
create or replace function public.create_cache(
  p_title text,
  p_latitude double precision,
  p_longitude double precision,
  p_difficulty smallint default 1,
  p_description text default null,
  p_location_name text default null,
  p_image text default null,
  p_hints text[] default '{}',
  p_secret_code text default null
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_secret_code, public.generate_secret_code())));
  v_hints text[] := coalesce(p_hints, '{}');
  v_cache_id uuid;
  v_hint text;
  v_order smallint := 0;
begin
  if v_user is null then
    raise exception 'You need to be logged in to add a cache.';
  end if;

  if coalesce(array_length(v_hints, 1), 0) > 3 then
    raise exception 'A cache can have at most 3 hints.';
  end if;

  insert into public.caches
    (title, description, latitude, longitude, location_name, difficulty, image, created_by)
  values
    (p_title, p_description, p_latitude, p_longitude, p_location_name, p_difficulty, p_image, v_user)
  returning id into v_cache_id;

  insert into public.cache_secrets (cache_id, secret_code)
  values (v_cache_id, v_code);

  -- Blank hints are skipped; the rest are numbered 1, 2, 3 in order.
  foreach v_hint in array v_hints loop
    if nullif(trim(v_hint), '') is not null then
      v_order := v_order + 1;
      insert into public.hints (cache_id, hint_order, hint_text)
      values (v_cache_id, v_order, trim(v_hint));
    end if;
  end loop;

  return json_build_object('cache_id', v_cache_id, 'secret_code', v_code);
end;
$$;

-- ---------------------------------------------------------------------------
-- 2c. log_find(): checks the code, then saves the find. Returns the find's id.
-- Frontend:
--   const { data, error } = await supabase.rpc('log_find', {
--     p_cache_id, p_secret_code, p_rating, p_journal_note,
--   })
--   if (error) show error.message under the code box
-- ---------------------------------------------------------------------------
create or replace function public.log_find(
  p_cache_id uuid,
  p_secret_code text,
  p_rating smallint default null,
  p_journal_note text default null,
  p_photo text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_cache public.caches%rowtype;
  v_find_id bigint;
begin
  if v_user is null then
    raise exception 'You need to be logged in to log a find.';
  end if;

  select * into v_cache from public.caches where id = p_cache_id;
  if not found or not v_cache.is_active then
    raise exception 'This cache isn''t active.';
  end if;

  if v_cache.created_by = v_user then
    raise exception 'You hid this cache, so you can''t log it as a find.';
  end if;

  if not exists (
    select 1 from public.cache_secrets s
    where s.cache_id = p_cache_id
      and s.secret_code = upper(trim(p_secret_code))
  ) then
    raise exception 'That code doesn''t match. Check the slip and try again.';
  end if;

  insert into public.finds (cache_id, finder_id, rating, journal_note, photo)
  values (p_cache_id, v_user, p_rating, p_journal_note, p_photo)
  returning id into v_find_id;

  return v_find_id;
exception
  when unique_violation then
    raise exception 'You''ve already logged this cache!';
end;
$$;

-- Only logged-in users can call these. (New functions are callable by
-- everyone by default, so we take that away first.)
revoke execute on function public.generate_secret_code() from public, anon;
revoke execute on function public.create_cache(text, double precision, double precision, smallint, text, text, text, text[], text) from public, anon;
revoke execute on function public.log_find(uuid, text, smallint, text, text) from public, anon;
grant execute on function public.generate_secret_code() to authenticated;
grant execute on function public.create_cache(text, double precision, double precision, smallint, text, text, text, text[], text) to authenticated;
grant execute on function public.log_find(uuid, text, smallint, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. RLS policies.
-- "grant" says which columns/actions a role may touch at all;
-- a "policy" says which rows. Both have to allow it.
-- ---------------------------------------------------------------------------

-- caches: anyone (even logged out) sees active caches; creators also see
-- their own inactive ones. New caches only come in through create_cache.
-- Nobody can delete (caches are never deleted; set is_active = false).
revoke all on public.caches from anon, authenticated;
grant select on public.caches to anon, authenticated;
grant update (title, description, latitude, longitude, location_name, difficulty, image, is_active)
  on public.caches to authenticated;

create policy "Anyone can see active caches"
  on public.caches for select to anon, authenticated
  using (is_active or created_by = (select auth.uid()));

create policy "Creators can update their own caches"
  on public.caches for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

-- hints: visible whenever you can see the cache. The creator can add, edit,
-- and remove hints on their own caches (Edit Cache page).
revoke all on public.hints from anon, authenticated;
grant select on public.hints to anon, authenticated;
grant insert, delete on public.hints to authenticated;
grant update (hint_order, hint_text, is_ai_generated) on public.hints to authenticated;

create policy "Hints are visible with their cache"
  on public.hints for select to anon, authenticated
  using (exists (select 1 from public.caches c where c.id = hints.cache_id));

create policy "Creators can add hints to their caches"
  on public.hints for insert to authenticated
  with check (exists (
    select 1 from public.caches c
    where c.id = hints.cache_id and c.created_by = (select auth.uid())
  ));

create policy "Creators can edit hints on their caches"
  on public.hints for update to authenticated
  using (exists (
    select 1 from public.caches c
    where c.id = hints.cache_id and c.created_by = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.caches c
    where c.id = hints.cache_id and c.created_by = (select auth.uid())
  ));

create policy "Creators can remove hints from their caches"
  on public.hints for delete to authenticated
  using (exists (
    select 1 from public.caches c
    where c.id = hints.cache_id and c.created_by = (select auth.uid())
  ));

-- finds: you see and edit only your own (your journal). New finds only come
-- in through log_find, so nobody can skip the code check. You can change
-- your rating/note/photo, but not which cache the find is for.
-- (The leaderboard will read all finds through its own function in step 5.)
revoke all on public.finds from anon, authenticated;
grant select on public.finds to authenticated;
grant update (rating, journal_note, photo) on public.finds to authenticated;

create policy "Users can see their own finds"
  on public.finds for select to authenticated
  using (finder_id = (select auth.uid()));

create policy "Users can update their own finds"
  on public.finds for update to authenticated
  using (finder_id = (select auth.uid()))
  with check (finder_id = (select auth.uid()));

-- messages: intentionally left with no policies (locked) until messaging
-- is built.

commit;
