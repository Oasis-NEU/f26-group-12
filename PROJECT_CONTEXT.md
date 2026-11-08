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
- Journal of each user's finds with difficulty and star rating
- Rate caches after finding them
- Log in and sign up with email
- Account menu, and people need a way to log out.
- Automatic secret codes for every cache before it's saved.
- Success screen where person hiding the cache has to see code so they can put it on the slip.
- Print a slip, code only
- Page not found for unfindable pages

Next:
- Score and leaderboard (points based on cache difficulty)
- "Found" tab in the UI separating caches you've found from ones you haven't
- Log in with Google, plus the “Choose a username”
- Forgot password
- Map filters (All / To find / My finds): this replaces the “Found” tab already listed under Next.
- My caches page
- Edit cache and take down
- Landing page

Nice-to-have:
- AI-generated hints from images
- Google Maps routes through multiple caches (toggle to hide found caches, or search within a radius)
- Location check as a second layer when logging finds
- Warning when someone adds a cache within ~10 m of an existing one
- Messaging between geocachers (about finds or hints)
- The QR code on a slip

Frontend goals: great design, clean and easy UI, fast.

## Tech stack

- **Frontend:** React + Vite + Tailwind
- **Database:** Supabase (Postgres), accessed from React with `@supabase/supabase-js`
- **Server-side:** Supabase Edge Functions in supabase/functions/ (Deno). No separate backend folder.
- Supabase URL and public key live in `frontend/.env.local` (copied from `frontend/.env.example`), which must stay in `.gitignore`. Share keys privately, never in the repo.
- **Routing:** React Router (`react-router` package, not `react-router-dom`)
- **Icons:** Lucide (`lucide-react`), matching the Lucide icons in Figma
- **Design:** Figma file "Husky Design" (ask a teammate for access). Gray layouts for every page are on the Sketches page.

## Routes

Defined in `frontend/src/App.jsx`. Every route sits inside `Layout` (`frontend/src/components/Layout.jsx`), which shows the nav bar. Page components live in `frontend/src/pages/`.

| path | page component | notes |
|---|---|---|
| `/` | `MapPage` | home page |
| `/caches/new` | `AddCachePage` | shows the "Cache hidden!" success state after saving |
| `/caches/:cacheId` | `CacheDetailPage` | |
| `/caches/:cacheId/log` | `LogFindPage` | shows the "Find logged!" success state after saving |
| `/caches/:cacheId/edit` | `EditCachePage` | |
| `/journal` | `JournalPage` | |
| `/login` | `LoginPage` | |
| `/leaderboard` | `LeaderboardPage` | |
| `/my-caches` | `MyCachesPage` | |
| `/welcome` | `LandingPage` | landing page lives here for now |
| `*` | `NotFoundPage` | any URL not listed above |

There is no Messages page; messaging is on hold. Link between pages with `<Link>` / `<NavLink>` from `react-router`, not `<a>`.

## Database schema

Every table has `id` (primary key) and `created_at` (`timestamptz`, default `now()`). `caches`, `hints`, and `profiles` use `uuid` ids; `finds` and `messages` currently use `int8` ids, which works fine.

The SQL copy of the schema lives at `supabase/schema.sql`. Update it whenever a table changes.

### `profiles` (one row per user)
| column | type | notes |
|---|---|---|
| id | uuid | PK, FK → `auth.users.id` (on delete cascade), no default |
| username | text | unique, required |
| avatar_url | text | optional |

A profile is created automatically on signup by the `on_auth_user_created` trigger (function `handle_new_user`). It uses the `username` passed in `signUp({ options: { data: { username } } })`, or a placeholder like `user_1a2b3c4d`. The frontend never inserts profiles itself.

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

Unique constraint `one_hint_per_order` on (`cache_id`, `hint_order`): each cache has at most one hint 1, one hint 2, and one hint 3.

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
- **The map is the home page** ("/"). The landing page is at /welcome for now.
- **Secret codes are generated automatically:** 6 characters, uppercase, never
  0, O, 1, I, or L. The hider can swap it with "New code" before saving;
  after saving it's locked.
- **Wrong codes show an inline error** under the code box, not a new screen.
- **Difficulty is always bars + "Difficulty N"; ratings are always stars.**
- **Map filters (All / To find / My finds) are about the logged-in user's finds.**
  Hidden when logged out. Found caches show a checkmark.
- **Success screens ("Cache hidden!", "Find logged!") are page states, not routes.**

## Security to-do (before real users)

- **Row Level Security (RLS) is ON for every table** (as of 11/08). RLS means the database checks a rule ("policy") before letting the frontend read or change a row.
  - `profiles` has policies: anyone can read profiles; users can only edit their own.
  - `caches`, `hints`, `finds`, and `messages` have **no policies yet**, so the frontend gets back empty results (`[]`) from them. That's expected, not a bug. Policies are next: anyone can read active caches and hints, logged-in users can add caches, only the creator can edit their own, nobody can delete, and messages are only visible to their sender and receiver.
- `secret_code` still lives in `caches`. Before real caches go out, it moves to a creator-only table, and finds are logged through a database function that checks the code, so the frontend never sees codes.
- Deadline: all of this before we place real caches (11/22).

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
- When you change the Supabase schema, update `supabase/schema.sql` and this file.
- Never commit `.env`.

## Design
- Each page has a phone frame (393 wide) and a desktop frame (1440 wide) in Figma.
  Phone is the base Tailwind styles; desktop uses lg: classes.
- Notes beside frames describe states and what changes on desktop. They are
  instructions, not page content. Frames and their notes are grouped in sections;
  link the section, not just the frame.
- Colors and fonts: TBD (being set up on the Foundations page).
