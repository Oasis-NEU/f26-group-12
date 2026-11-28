-- Leaderboard: everyone's points, ranked, for the /leaderboard page.
-- NOT APPLIED YET. Run ONCE: Supabase dashboard -> SQL Editor -> New query ->
-- paste this whole file -> Run. When it's done, change the line above to
-- "ALREADY APPLIED to the live database on <date>. Don't run it again."
-- (Running it twice is harmless: it replaces the same function.)
--
-- Why a function: each person can only read their OWN finds (RLS), so the
-- app can't add up everyone's points itself. This function runs as the
-- database owner (SECURITY DEFINER), adds the points up inside the database
-- and hands back only the totals.
--
-- What it returns, in plain language: one row per person who has found at
-- least one cache, best first:
--   rank      1, 2, 3... People with the same points share a rank, and the
--             next rank skips ahead (10, 8, 8, 5 points -> ranks 1, 2, 2, 4).
--   username  their public username (profiles are already public).
--   points    the difficulty of every cache they've found, added up. Caches
--             taken down later still count: points earned stay earned.
--   finds     how many caches they've found.
--   is_me     true on the logged-in person's own row, so the page can
--             highlight it. Always false for logged-out visitors.
-- Only the top p_limit people (50 unless asked; never more than 100). If
-- you're logged in, have a find and aren't in the top p_limit, your own row
-- comes last (with your real rank), so the page can show it under the list.
--
-- What it never returns: user ids, which caches anyone found, ratings,
-- journal notes, photos, or secret codes. Everyone can call it, including
-- logged-out visitors (the team agreed the leaderboard is public).
--
-- search_path is empty, the setting Supabase's checker recommends for
-- SECURITY DEFINER functions: every table is named in full (public.finds),
-- so nothing can be swapped in under a matching name.
--
-- Call it like this (src/lib/leaderboard.js):
--   supabase.rpc('leaderboard', { p_limit: 50 })
-- Each row: { rank, username, points, finds, is_me }.

CREATE OR REPLACE FUNCTION public.leaderboard(p_limit integer DEFAULT 50)
RETURNS TABLE (rank integer, username text, points integer, finds integer, is_me boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  -- 1. Each finder's totals. This joins caches directly (not through the
  --    caches policy), so taken-down caches still count.
  WITH totals AS (
    SELECT
      f.finder_id,
      sum(c.difficulty)::integer AS points,
      count(*)::integer AS finds
    FROM public.finds f
    JOIN public.caches c ON c.id = f.cache_id
    GROUP BY f.finder_id
  ),
  -- 2. Rank them. rank() gives ties the same number; place (1, 2, 3...,
  --    ties broken by username) decides who makes the top p_limit and the
  --    order rows come back in.
  ranked AS (
    SELECT
      rank() OVER (ORDER BY t.points DESC)::integer AS rank,
      row_number() OVER (ORDER BY t.points DESC, p.username) AS place,
      p.username,
      t.points,
      t.finds,
      coalesce(p.id = auth.uid(), false) AS is_me
    FROM totals t
    JOIN public.profiles p ON p.id = t.finder_id
  )
  -- 3. The top p_limit (kept between 1 and 100), plus your own row.
  SELECT r.rank, r.username, r.points, r.finds, r.is_me
  FROM ranked r
  WHERE r.place <= least(greatest(coalesce(p_limit, 50), 1), 100)
     OR r.is_me
  ORDER BY r.place
$$;

REVOKE EXECUTE ON FUNCTION public.leaderboard(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.leaderboard(integer) TO anon, authenticated;
