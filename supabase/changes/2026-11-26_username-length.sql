-- Usernames: not blank, and at most 30 characters.
-- NOT APPLIED YET. Run ONCE: Supabase dashboard -> SQL Editor -> New query ->
-- paste this whole file -> Run. When it's done, change the line above to
-- "ALREADY APPLIED to the live database on <date>. Don't run it again."
--
-- What this does, in plain language:
--   The sign-up form already stops usernames that are blank or longer than
--   30 characters (frontend/src/lib/auth.js, USERNAME_MAX_LENGTH). This adds
--   the same rule to the database, so it holds even if someone skips the
--   form. Signup's placeholder usernames ("user_1a2b3c4d") are 13 characters,
--   so they still fit.
--
-- It's safe to run on today's data: no profile breaks the rule (checked on
-- 2026-11-26, when there were no profiles yet). If one did, this would fail
-- and change nothing.

ALTER TABLE public.profiles
  ADD CONSTRAINT username_length CHECK (btrim(username) <> '' AND char_length(username) <= 30);
