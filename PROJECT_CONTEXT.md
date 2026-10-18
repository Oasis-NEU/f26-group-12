# Husky Geocaching — Project Context

Shared context for our Oasis Project Series team. Upload this to the shared Claude Project (and keep a copy in the repo) so anyone can pick up where we left off. **If you change something important, update this file.**

## What we're building

A geocaching web app for Northeastern students, starting on campus and scaling up to Boston. Students hide small items in real locations and log them on our site. Other Huskies search for them using a map and hints, log their finds, and earn points. The goal is to get students (especially people new to campus or Boston) out exploring.

We're building this through the Oasis Project Series. Most of the team is new to web development, so explanations should be step by step.

## Features (roughly in priority order)

Core:
- Add a cache with a difficulty rating (1–5)
- Map of campus/Boston showing existing caches
- Find a cache and log it (confirmed with a secret code, see Decisions)
- Hints per cache (up to 3, revealed in order)
- Journal of each user's finds
- Rate caches after finding them

Next:
- Score and leaderboard (points based on cache difficulty)
- Messaging between geocachers (about finds or hints)
- "Found" tab in the UI separating caches you've found from ones you haven't

Nice-to-have:
- AI-generated hints from images
- Google Maps routes through multiple caches (toggle to hide found caches, or search within a radius)
- Location check as a second layer when logging finds
- Warning when someone adds a cache within ~10 m of an existing one

Frontend goals: great design, clean and easy UI, fast.

## Tech stack

- **Frontend:** React + Vite + Tailwind
- **Database:** Supabase (Postgres), accessed from React with `@supabase/supabase-js`
- **Backend:** Python (venv set up), role still being defined
- Supabase URL and public key live in the frontend `.env` file, which must stay in `.gitignore`. Share keys privately, never in the repo.

## Database schema

Every table has `id` (primary key) and `created_at` (`timestamptz`, default `now()`). `caches`, `hints`, and `profiles` use `uuid` ids; `finds` and `messages` currently use `int8` ids, which works fine.

The SQL copy of the schema lives at `backend/supabase/schema.sql`. Update it whenever a table changes.

### `profiles` (one row per user)
| column | type | notes |
|---|---|---|
| id | uuid | PK, FK → `auth.users.id` (on delete cascade), no default |
| username | text | unique, required |
| avatar_url | text | optional |

### `caches`
| column | type | notes |
|---|---|---|
| title | text | required |
| description | text | optional |
| latitude / longitude | float8 | required |
| location_name | text | optional, e.g. "near Snell Library" |
| difficulty | int2 | required, default 1, check 1–5 |
| image | text | optional, photo URL |
| is_active | bool | default true; set false instead of deleting |
| secret_code | text | required; code hidden inside the physical cache |
| created_by | uuid | FK → `profiles.id`, nullable, default `auth.uid()`, on delete **set null** |

### `hints`
| column | type | notes |
|---|---|---|
| cache_id | uuid | FK → `caches.id`, on delete cascade |
| hint_order | int2 | 1–3, no default |
| hint_text | text | required |
| is_ai_generated | bool | default false |

### `finds` (journal, ratings, and scoring)
| column | type | notes |
|---|---|---|
| cache_id | uuid | FK → `caches.id`, on delete cascade |
| finder_id | uuid | FK → `profiles.id`, on delete cascade |
| rating | int2 | optional, 1–5 |
| journal_note | text | optional |
| photo | text | optional |

Unique constraint `one_find_per_person` on (`cache_id`, `finder_id`): a person can only log each cache once, but many people can find the same cache.

### `messages`
| column | type | notes |
|---|---|---|
| sender_id | uuid | FK → `profiles.id`, on delete cascade |
| receiver_id | uuid | FK → `profiles.id`, on delete cascade |
| cache_id | uuid | FK → `caches.id`, nullable, on delete set null |
| content | text | required |

Realtime is enabled on `messages` only.

### Calculated, not stored
- **Number of caches:** count rows in `caches`
- **A user's journal / found list:** rows in `finds` for that user
- **Score / leaderboard:** sum of `difficulty` for each cache a user has found

## Key decisions

- **Finds are confirmed with a secret code.** Whoever hides a cache puts a code (or QR code) inside it. The finder enters or scans it to log the find. This proves they actually opened the cache. A GPS location check may be added later as a second layer.
- **Finders leave the item in place** for the next person. A cache isn't "used up" when found; "found" is tracked per user in `finds`.
- **Caches are never deleted.** If a creator deletes their account, their caches stay up (`created_by` becomes null). To take a cache down, set `is_active = false`.
- **We don't store users' locations.** If we add a location check, it runs in the browser only and nothing gets saved (the "collect less" rule from the data ethics session).
- **No real personal data until security is in place.** Use fake test accounts and test caches for now.

## Security to-do (before real users)

- **Row Level Security (RLS) is currently OFF** on all tables, following the club's demo. This means anyone with our public key can read, edit, or delete anything. Fine for development, not for launch.
- Before launch, turn RLS on and write policies, e.g. anyone can read caches, logged-in users can add caches, only the creator can edit their own, nobody can delete.
- `secret_code` is currently readable by anyone through the API. Before launch, code checking needs to happen server-side (e.g. a Supabase database function) so the frontend never sees the codes.
- Expected timing: around the club's Auth session (HS 7), and definitely before we place real caches (11/08).

## Timeline (subject to change)

| date | goal |
|---|---|
| 10/11 | Repo set up: React, Tailwind, venv (backend) ✅ |
| 10/18 | Basic backend done (Supabase tables set up) |
| 10/25 | Improve backend, start frontend (basic UI and design) |
| 11/01 | Frontend done (polished design, easy navigation) |
| 11/08 | Test all features, place caches, make improvements |
| 11/15 | Finished; practice presentation |

Club sessions for reference: HS 4 AI Implementation (10/18), HS 5 API Development (10/25), HS 7 Auth and HS 8 Deployment (dates TBD), then Demo Day.

## Team conventions

- Track work in GitHub Projects; plan at the start of each hack session.
- When you change the Supabase schema, update `backend/supabase/schema.sql` and this file.
- Never commit `.env`.
