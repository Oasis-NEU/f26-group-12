-- Fake test caches around Northeastern's campus, so the frontend has data
-- to show while we build. TEST DATA ONLY: these aren't real hidden caches,
-- and the coordinates are approximate.
--
-- How to run: Supabase dashboard -> SQL Editor -> New query -> paste this
-- whole file -> Run. It's safe to run more than once: rows that already
-- exist are skipped instead of duplicated.
--
-- The caches use easy-to-spot ids (00000000-...-0001 and so on) so the hints
-- below can point at them. created_by is left empty because these caches
-- weren't made by a real user.

insert into public.caches
  (id, title, description, latitude, longitude, location_name, difficulty, secret_code, is_active)
values
  ('00000000-0000-0000-0000-000000000001', 'Snell Study Break',
   'A tiny container somewhere outside the library. Good first find!',
   42.3381, -71.0884, 'near Snell Library', 1, 'K7MQ2X', true),
  ('00000000-0000-0000-0000-000000000002', 'Common Ground',
   'Hidden near the benches on the quad.',
   42.3374, -71.0893, 'Centennial Common', 2, 'B4TZ9R', true),
  ('00000000-0000-0000-0000-000000000003', 'Curry Crawl',
   'Look low, not high.',
   42.3390, -71.0876, 'outside Curry Student Center', 2, 'H8WP3N', true),
  ('00000000-0000-0000-0000-000000000004', 'Krentzman Corner',
   'A magnetic container in a quiet corner of the quad.',
   42.3398, -71.0888, 'Krentzman Quad', 3, 'D6YC4V', true),
  ('00000000-0000-0000-0000-000000000005', 'Marino Mile',
   'Near where people stretch before a run.',
   42.3402, -71.0903, 'near Marino Recreation Center', 3, 'Q2FJ7S', true),
  ('00000000-0000-0000-0000-000000000006', 'Across the Tracks',
   'Cross the bridge and keep your eyes open.',
   42.3377, -71.0868, 'near ISEC', 4, 'X9GM5T', true),
  ('00000000-0000-0000-0000-000000000007', 'Matthews Mystery',
   'The hardest one on campus. Bring patience.',
   42.3412, -71.0846, 'near Matthews Arena', 5, 'R3KV8E', true),
  -- Taken down on purpose, to test that inactive caches don't show on the map.
  ('00000000-0000-0000-0000-000000000008', 'Retired Ruggles Cache',
   'This cache was taken down. It should NOT appear on the map.',
   42.3364, -71.0890, 'near Ruggles station', 2, 'P5NW6A', false)
on conflict (id) do nothing;

-- Hints: up to 3 per cache, revealed in order (hint_order 1, 2, 3).
-- "where not exists" skips a hint if that cache already has one at that spot.
insert into public.hints (cache_id, hint_order, hint_text)
select v.cache_id, v.hint_order, v.hint_text
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 1::smallint, 'Check near the bike racks.'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 2::smallint, 'It''s on the side facing Forsyth St.'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 1::smallint, 'Count the benches.'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 2::smallint, 'The third bench from the path.'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 3::smallint, 'Under the seat.'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 1::smallint, 'Near a planter.'),
  ('00000000-0000-0000-0000-000000000004'::uuid, 1::smallint, 'Metal sticks to magnets.'),
  ('00000000-0000-0000-0000-000000000004'::uuid, 2::smallint, 'Try the railings.'),
  ('00000000-0000-0000-0000-000000000005'::uuid, 1::smallint, 'Look for the stretching area.'),
  ('00000000-0000-0000-0000-000000000006'::uuid, 1::smallint, 'Not on the bridge itself.'),
  ('00000000-0000-0000-0000-000000000006'::uuid, 2::smallint, 'At the end closest to ISEC.'),
  ('00000000-0000-0000-0000-000000000007'::uuid, 1::smallint, 'Old buildings have old secrets.')
) as v(cache_id, hint_order, hint_text)
where not exists (
  select 1 from public.hints h
  where h.cache_id = v.cache_id and h.hint_order = v.hint_order
);
