-- Leaderboard: everyone's points, ranked, for the /leaderboard page.
-- NOT APPLIED YET. Run ONCE: Supabase dashboard -> SQL Editor -> New query ->
-- paste this whole file -> Run. When it's done, change the line above to
-- "ALREADY APPLIED to the live database on <date>. Don't run it again."
-- (Running it twice is harmless: it drops and recreates the same function.)
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
--   in_top    true for the top p_limit people (the list); false only on
--             your own row when it comes back from outside the top.
-- Only the top p_limit people (50 unless asked; never more than 100). If
-- you're logged in, have a find and aren't in the top p_limit, your own row
-- comes last (with your real rank and in_top false), so the page can show
-- it under the list.
--
-- Who makes the top p_limit when people tie: more points first; on equal
-- points, whoever got there first (the time of their latest find, earliest
-- first, since points only ever go up); then username. Tied people still
-- show the same rank.
--
-- What it never returns: user ids, which caches anyone found, when anyone
-- found anything, ratings, journal notes, photos, or secret codes. Everyone
-- can call it, including logged-out visitors (the team agreed the
-- leaderboard is public).
--
-- search_path is empty, the setting Supabase's checker recommends for
-- SECURITY DEFINER functions: every table is named in full (public.finds),
-- so nothing can be swapped in under a matching name.
--
-- Call it like this (src/lib/leaderboard.js):
--   supabase.rpc('leaderboard', { p_limit: 50 })
-- Each row: { rank, username, points, finds, is_me, in_top }.

-- Dropped first, in case an earlier draft of this function was ever run
-- (Postgres can't change a function's columns in place).
DROP FUNCTION IF EXISTS public.leaderboard(integer);

CREATE FUNCTION public.leaderboard(p_limit integer DEFAULT 50)
RETURNS TABLE (rank integer, username text, points integer, finds integer, is_me boolean, in_top boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  -- 1. Each finder's totals. This joins caches directly (not through the
  --    caches policy), so taken-down caches still count. reached_at is when
  --    they reached their current score (their latest find); it only
  --    settles ties and is never returned.
  WITH totals AS (
    SELECT
      f.finder_id,
      sum(c.difficulty)::integer AS points,
      count(*)::integer AS finds,
      max(f.created_at) AS reached_at
    FROM public.finds f
    JOIN public.caches c ON c.id = f.cache_id
    GROUP BY f.finder_id
  ),
  -- 2. Rank them. rank() gives ties the same number; place (1, 2, 3...)
  --    decides who makes the top p_limit and the order rows come back in.
  ranked AS (
    SELECT
      rank() OVER (ORDER BY t.points DESC)::integer AS rank,
      row_number() OVER (ORDER BY t.points DESC, t.reached_at ASC, p.username) AS place,
      p.username,
      t.points,
      t.finds,
      coalesce(p.id = auth.uid(), false) AS is_me
    FROM totals t
    JOIN public.profiles p ON p.id = t.finder_id
  ),
  -- 3. How many make the list: p_limit, kept between 1 and 100.
  list_size AS (
    SELECT least(greatest(coalesce(p_limit, 50), 1), 100) AS n
  )
  -- 4. The top of the list, plus your own row.
  SELECT r.rank, r.username, r.points, r.finds, r.is_me, r.place <= s.n
  FROM ranked r
  CROSS JOIN list_size s
  WHERE r.place <= s.n
     OR r.is_me
  ORDER BY r.place
$$;

REVOKE EXECUTE ON FUNCTION public.leaderboard(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.leaderboard(integer) TO anon, authenticated;
