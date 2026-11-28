-- Tightens cache_ratings (from 2026-11-27_cache-ratings.sql) after the
-- cache-cards review.
-- ALREADY APPLIED to the live database on 2026-11-27. Don't run it again.
-- (Running it twice is harmless: it drops and recreates the same function.)
--
-- What changes, in plain language:
--   1. It no longer returns how many times each cache was found. No screen
--      used it, and once points and the leaderboard are public, a find count
--      that anyone can check could hint at who found which cache ("collect
--      less"). It returns only the average rating and how many ratings.
--   2. search_path is now empty, the setting Supabase's checker recommends
--      for SECURITY DEFINER functions: every table is named in full
--      (public.caches), so nothing can be swapped in under a matching name.
--
-- The return columns change, so the old function is dropped first (Postgres
-- can't change them in place). Between the two statements the app just
-- hides ratings, as it does whenever they can't load.
--
-- Call it the same way (src/lib/cacheRatings.js):
--   supabase.rpc('cache_ratings')                          -- every cache
--   supabase.rpc('cache_ratings', { p_cache_ids: [id] })   -- just these
-- Each row: { cache_id, average_rating, rating_count }.

DROP FUNCTION IF EXISTS public.cache_ratings(uuid[]);

CREATE FUNCTION public.cache_ratings(p_cache_ids uuid[] DEFAULT NULL)
RETURNS TABLE (cache_id uuid, average_rating numeric, rating_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    c.id,
    round(avg(f.rating)::numeric, 1),
    count(f.rating)::integer
  FROM public.caches c
  LEFT JOIN public.finds f ON f.cache_id = c.id
  WHERE c.is_active
    AND (p_cache_ids IS NULL OR c.id = ANY (p_cache_ids))
  GROUP BY c.id
$$;

REVOKE EXECUTE ON FUNCTION public.cache_ratings(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.cache_ratings(uuid[]) TO anon, authenticated;
