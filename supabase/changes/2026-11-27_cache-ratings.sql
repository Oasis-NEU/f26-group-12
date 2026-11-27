-- Average ratings for caches: what the map's cache cards and the cache page
-- show ("4.6 (12)", or "No ratings yet").
-- ALREADY APPLIED to the live database on 2026-11-27. (Running it again is
-- harmless: it replaces the function with the same code.)
--
-- What this does, in plain language:
--   Each person can only read their own finds (RLS on finds), so the app
--   can't average everyone's ratings itself. This adds one function that
--   does the adding-up inside the database and hands back only the totals
--   per cache: the average rating (to one decimal), how many ratings it
--   has, and how many times it's been found. Never who rated it, what they
--   wrote, or when. Taken-down caches (is_active = false) are left out.
--
--   It's SECURITY DEFINER (runs as the database owner) so it can count
--   every find, and it's open to logged-out visitors too (anon), since the
--   map shows ratings to everyone.
--
-- Call it from the frontend (src/lib/cacheRatings.js):
--   supabase.rpc('cache_ratings')                          -- every cache
--   supabase.rpc('cache_ratings', { p_cache_ids: [id] })   -- just these
-- Each row: { cache_id, average_rating, rating_count, find_count }.
-- average_rating is null when nobody has rated it yet.

CREATE OR REPLACE FUNCTION public.cache_ratings(p_cache_ids uuid[] DEFAULT NULL)
RETURNS TABLE (cache_id uuid, average_rating numeric, rating_count integer, find_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    round(avg(f.rating)::numeric, 1),
    count(f.rating)::integer,
    count(f.id)::integer
  FROM public.caches c
  LEFT JOIN public.finds f ON f.cache_id = c.id
  WHERE c.is_active
    AND (p_cache_ids IS NULL OR c.id = ANY (p_cache_ids))
  GROUP BY c.id
$$;

REVOKE EXECUTE ON FUNCTION public.cache_ratings(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.cache_ratings(uuid[]) TO anon, authenticated;
