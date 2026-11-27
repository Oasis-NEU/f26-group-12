-- Saved caches (favourites): a person bookmarks caches they want to go find.
-- ALREADY APPLIED to the live database on 2026-11-27. Don't run it again
-- (the table already exists, so it would stop with an error).
--
-- What this does, in plain language:
--   Adds one table, saved_caches: one row per (person, cache) they saved.
--   Each person can only see, add and remove their OWN saves, and nobody
--   else can tell what they saved (RLS below). A person can save a cache
--   once (the unique rule), and only a cache they can see (an active one,
--   or their own). Unsaving deletes the row; that's fine here, unlike
--   caches, which are never deleted.
--
--   user_id fills itself in with whoever is logged in (DEFAULT auth.uid()),
--   and the app is only allowed to send cache_id, so nobody can save on
--   someone else's behalf.
--
-- The frontend uses it in src/lib/savedCaches.js:
--   supabase.from('saved_caches').select('cache_id')        -- your saves
--   supabase.from('saved_caches').insert({ cache_id })        -- save
--   supabase.from('saved_caches').delete().eq('cache_id', id) -- unsave

CREATE TABLE public.saved_caches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  cache_id uuid NOT NULL,
  CONSTRAINT saved_caches_pkey PRIMARY KEY (id),
  CONSTRAINT one_save_per_person UNIQUE (user_id, cache_id),
  CONSTRAINT saved_caches_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT saved_caches_cache_id_fkey FOREIGN KEY (cache_id) REFERENCES public.caches(id) ON DELETE CASCADE
);

ALTER TABLE public.saved_caches ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.saved_caches FROM anon, authenticated;
GRANT SELECT, DELETE ON public.saved_caches TO authenticated;
-- Only cache_id: user_id always comes from the default above.
GRANT INSERT (cache_id) ON public.saved_caches TO authenticated;

CREATE POLICY "Users can see their own saved caches"
  ON public.saved_caches FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- The cache has to be one they can see (the caches policy decides: active,
-- or their own), so a taken-down cache can't be saved.
CREATE POLICY "Users can save caches they can see"
  ON public.saved_caches FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (SELECT 1 FROM public.caches c WHERE c.id = saved_caches.cache_id)
  );

CREATE POLICY "Users can unsave their own saved caches"
  ON public.saved_caches FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));
