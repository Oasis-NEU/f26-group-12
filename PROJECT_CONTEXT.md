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
- Journal of each user's finds with difficulty and star rating, plus their points and caches found. Ratings ("Rate it" / "Change rating") and journal notes ("Add a note" / "Edit note") can be added or changed in place in the journal; only that one column is saved.
- Rate caches after finding them
- Log in and sign up with email (log in with a password, or with a 6-digit code emailed to you), on the Log in page or in a login dialog over the page you're on
- Forgot password (reset by an emailed link)
- Account menu, and people need a way to log out.
- Automatic secret codes for every cache before it's saved.
- Success screen where person hiding the cache has to see code so they can put it on the slip.
- Print a slip: the cache's name, its code and one line telling finders what to do (no QR code until the site is deployed)
- Page not found for unfindable pages
- My caches page (`/my-caches`): the caches you've hidden, active first, each with its place, "Edit", and "Print slip" (active caches only), which prints the same slip as "Cache hidden!". The code is loaded from `cache_secrets` only when "Print slip" is pressed; the list never selects it. Find counts and ratings are hidden for now (see decisions).
- Edit cache (`/caches/:cacheId/edit`), using the same form pieces as Hide a cache (`components/cacheForm/`). The secret code is shown locked, with "Print slip" (the shared slip). "Take down cache" asks first, in the page ("Take it down?"), then sets `is_active = false`; a taken-down cache has "Put it back on the map" (`is_active = true`). Caches are never deleted. With unsaved changes, closing the tab and "Cancel" ask first (header links don't yet; see decisions).
- Favorites: an ink heart on each cache card, the map's popup and phone card, and a labelled "Favorite" button on the cache page; a "Favorites" map filter. Found caches stay favorites. Stored in `saved_caches`. (A Favorites tab in the Journal comes with the Journal rebuild.)
- Landing page (`/`, the home page): a "Hide and find caches around campus" kicker, the headline and student-written intro with "Find a cache" and "Hide a cache", the Snell Library photo, "How it works" in three steps (a trail down the page on phones, across it on desktop), and a small footer for this page only (what HuskyCache is, links to Map, Hide a cache, Journal and Leaderboard, and the GitHub repo). It loads no data. No made-up stats, sample caches or cache row; no About or Contact links until those pages exist.
- Score and leaderboard: points are the difficulty of every cache you've found, added up. `/leaderboard` ranks everyone with a find (from the `leaderboard` database function; anyone can see it, logged in or not), highlights your own row, and says where you are ("You're #23 with 9 points.") with a button that jumps to your row.

Next:
- "Found" tab in the UI separating caches you've found from ones you haven't
- Log in with Google, plus the “Choose a username”
- Map filters (All / To find / My finds): this replaces the “Found” tab already listed under Next.
- Street addresses and named places in the header search (with the map
  work): picking one opens the map there, nearest caches first; picking a
  cache still opens its page. Needs a geocoding service (Photon is the free
  option; Nominatim's public API doesn't allow search-as-you-type).

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
| `/` | `LandingPage` | home page |
| `/map` | `MapPage` | the map of caches |
| `/caches/new` | `AddCachePage` | shows the "Cache hidden!" success state after saving |
| `/caches/:cacheId` | `CacheDetailPage` | |
| `/caches/:cacheId/log` | `LogFindPage` | shows the "Find logged!" success state after saving |
| `/caches/:cacheId/edit` | `EditCachePage` | |
| `/journal` | `JournalPage` | tabs: Finds, and Favorites (`?tab=favorites`) |
| `/login` | `LoginPage` | the header's "Log in" and every emailed link (confirm, reset) come here; elsewhere, logging in opens the login dialog over the page |
| `/leaderboard` | `LeaderboardPage` | |
| `/my-caches` | `MyCachesPage` | |
| `/welcome` | (redirect) | old landing page address; sends people to `/` |
| `*` | `NotFoundPage` | any URL not listed above |

There is no Messages page; messaging is on hold. Link between pages with `<Link>` / `<NavLink>` from `react-router`, not `<a>`.

## Database schema

Every table has `id` (primary key) and `created_at` (`timestamptz`, default `now()`). `caches`, `hints`, and `profiles` use `uuid` ids; `finds` and `messages` currently use `int8` ids, which works fine.

The SQL copy of the schema lives at `supabase/schema.sql`. Update it whenever a table changes.

### `profiles` (one row per user)
| column | type | notes |
|---|---|---|
| id | uuid | PK, FK → `auth.users.id` (on delete cascade), no default |
| username | text | unique, required, not blank, at most 30 characters (`username_length` check) |
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
| created_by | uuid | FK → `profiles.id`, nullable, default `auth.uid()`, on delete **set null** |

New caches are created only through the `create_cache` database function (see "Database functions" below), never with a direct insert.

### `cache_secrets` (creator-only)
| column | type | notes |
|---|---|---|
| cache_id | uuid | FK → `caches.id`, unique, on delete cascade |
| secret_code | text | required; check: 6 characters from `A–Z` and `2–9`, never 0, O, 1, I, or L |

The code hidden inside the physical cache. Only the cache's creator can read it. Finders never see it: `log_find` checks it inside the database.

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

### `saved_caches` (favourites)
| column | type | notes |
|---|---|---|
| user_id | uuid | FK → `profiles.id`, on delete cascade, default `auth.uid()` (the app never sends it) |
| cache_id | uuid | FK → `caches.id`, on delete cascade |

Unique constraint `one_save_per_person` on (`user_id`, `cache_id`). Each person sees, adds and removes only their own saves, and can only save caches they can see. Unsaving deletes the row.

### `messages`
| column | type | notes |
|---|---|---|
| sender_id | uuid | FK → `profiles.id`, on delete cascade |
| receiver_id | uuid | FK → `profiles.id`, on delete cascade |
| cache_id | uuid | FK → `caches.id`, nullable, on delete set null |
| content | text | required |

Realtime is enabled on `messages` only.

### Database functions (call with `supabase.rpc(...)`)
The first three need a logged-in user; `cache_ratings` and `leaderboard` work for everyone.

| function | what it does | returns |
|---|---|---|
| `generate_secret_code()` | a fresh random code, for the "New code" button | `'K7MQ2X'` |
| `create_cache(p_title, p_latitude, p_longitude, p_difficulty, p_description, p_location_name, p_image, p_hints, p_secret_code)` | saves the cache, up to 3 hints (array of text, blanks skipped), and its code in one step. `p_secret_code` is optional (random if left out). | `{ cache_id, secret_code }` |
| `log_find(p_cache_id, p_secret_code, p_rating, p_journal_note, p_photo)` | checks the code, then saves the find. Codes are case-insensitive. | the new find's `id` |
| `cache_ratings(p_cache_ids)` | each active cache's average rating (one decimal, `null` if unrated) and number of ratings. Totals only, never who rated what or how many found it. Leave `p_cache_ids` out for every cache. | rows of `{ cache_id, average_rating, rating_count }` |
| `leaderboard(p_limit)` | everyone with at least one find, ranked by points (the difficulty of every cache they've found, added up; taken-down caches still count). Ties share a rank (1, 2, 2, 4). The top `p_limit` people (default 50, at most 100; on equal points, whoever reached that score first makes the list, then username), with `in_top` true, plus your own row last (`in_top` false) if you're logged in and outside the top. No user ids: `is_me` marks your row. Never says which caches anyone found, or when. Added in `supabase/changes/2026-11-27_leaderboard.sql` (**not run in Supabase yet**; until it is, the Leaderboard page says it couldn't load). | rows of `{ rank, username, points, finds, is_me, in_top }` |

`log_find` errors have friendly messages you can show directly with `error.message`: wrong code, already logged ("You've already logged this cache!"), inactive cache, or trying to log a cache you hid yourself.

### Calculated, not stored
- **Number of caches:** count rows in `caches`
- **A user's journal / found list:** rows in `finds` for that user
- **Score / leaderboard:** sum of `difficulty` for each cache a user has found (the `leaderboard` function adds it up for everyone)

## Key decisions

- **Finds are confirmed with a secret code.** Whoever hides a cache puts a code (or QR code) inside it. The finder enters or scans it to log the find. This proves they actually opened the cache. A GPS location check may be added later as a second layer.
- **Finders leave the item in place** for the next person. A cache isn't "used up" when found; "found" is tracked per user in `finds`.
- **Caches are never deleted.** If a creator deletes their account, their caches stay up (`created_by` becomes null). To take a cache down, set `is_active = false`.
- **We don't store users' locations.** If we add a location check, it runs in the browser only and nothing gets saved (the "collect less" rule from the data ethics session).
- **No real personal data until security is in place.** Use fake test accounts and test caches for now.
- **The landing page is the home page** ("/"). The map is at /map, and the old /welcome address redirects to "/".
- **Secret codes are generated automatically:** 6 characters, uppercase, never
  0, O, 1, I, or L. The hider can swap it with "New code" before saving;
  after saving it's locked.
- **Wrong codes show an inline error** under the code box, not a new screen.
- **Difficulty is always bars + "Difficulty N"; ratings are always stars.**
- **Map filters (All / To find / My finds) are about the logged-in user's finds.**
  Hidden when logged out. Found caches show a checkmark.
- **Success screens ("Cache hidden!", "Find logged!") are page states, not routes.**
- **Search lives in the header** (desktop) and in the address bar as
  `/map?q=…`, so it's shared with the map's own search box (phones), survives
  a reload, and carries over from other pages. As you type, the header
  suggests matching caches (open their page) and places hiders named (show
  them on the map). Street addresses aren't searched yet; when added (with
  the map work), picking one should open the map with the nearest caches. The logo is a red map pin with
  a cache box (not the old red "N" square).
- **Logging in happens in a dialog on the page you're on** (2026-11-27). The
  heart when logged out (then that cache is favorited once they've logged
  in), the in-page "Log in" buttons ("Log in to log your find", "Log in to
  see where you rank", "Log in again") and the pages that need an account
  (Hide a cache, Log a find, Journal) open one login dialog
  (`components/login/LoginDialogProvider.jsx`, mounted once in `App.jsx`)
  instead of sending people to `/login`. Those pages show a calm signed-out
  message with the dialog open over it, and carry on once they've logged in.
  The dialog and the Log in page share the same screens
  (`components/login/LoginScreens.jsx`). `/login` stays a full page: the
  header's "Log in" goes there, and the emailed links (confirm, reset, the
  code email's link) land there, then go back to the page they started on
  (`?next=`). Setting a new password is only on the page. After sign-up,
  confirming the email in another tab of the same browser logs the dialog's
  tab in too (Supabase tells every tab), so it finishes what they were doing.
- **Secret codes on My caches are loaded one at a time, on demand**
  (2026-11-28). The list query never selects `secret_code`; "Print slip"
  reads that one cache's code from `cache_secrets` (creator-only by RLS)
  when it's pressed, and prints the shared slip (`components/CacheSlip.jsx`).
- **Edit cache saves within today's grants, in steps** (2026-11-28). The
  caches row is updated first, then the hints: existing ones get a
  text-only update, new ones are inserted, extra ones deleted (owners
  can't UPDATE `hints.cache_id`, so an upsert fails). Every update asks for
  its row back and counts zero rows as a failure, since RLS blocks updates
  silently. It isn't atomic; an `update_cache` RPC is planned on its own
  branch.
- **My caches hides find counts and ratings for now** (2026-11-28). The
  `finds` SELECT policy is own-rows only, so embedding a cache's finds
  always came back empty. A totals-only database function (count and
  average rating per cache) comes on its own branch; then they come back.
- **Leaving Edit cache with unsaved changes** (2026-11-28) asks first on
  close/reload (`beforeunload`) and on "Cancel" (in the page). In-app
  navigation (header links, Back) isn't blocked: React Router's
  `useBlocker` needs a data router (`createBrowserRouter`), and the app
  uses `<BrowserRouter>`; switching is a site-wide change for its own
  branch.
- **Taking a cache down asks first, in the page,** not with a browser
  pop-up, and can be undone: "Put it back on the map" sets `is_active`
  back to true (owners can already update `is_active`; no database change).
- **Links go places; buttons do things.** Underlined links only inside a
  sentence, to another page. Actions, and anything on its own line, are
  buttons: Primary (one per page), Secondary, then a quiet button with no
  outline. See "The Links Go Places Rule" in DESIGN.md.

## Security

**Row Level Security (RLS) is ON for every table.** RLS means the database checks a rule ("policy") before letting the frontend read or change a row. As of 11/15:

| table | who can read | who can change |
|---|---|---|
| `profiles` | anyone | users edit their own; created only by the signup trigger |
| `caches` | anyone sees active caches; creators also see their own inactive ones | add via `create_cache` only; creators edit their own; **nobody can delete** |
| `cache_secrets` | only the cache's creator | written only by `create_cache`; locked after saving |
| `hints` | anyone who can see the cache | the cache's creator can add, edit, remove |
| `finds` | users see only their own | add via `log_find` only; users can edit rating / note / photo on their own |
| `messages` | nobody yet (locked) | nobody yet |

Still to do:
- Run `supabase/changes/2026-11-27_leaderboard.sql` (the leaderboard function, written 11/27), since users can't read other people's finds directly.
- Messages policies, once messaging is built.

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
- Colors, fonts, text styles and corners come from the Figma Foundations page and
  live as Tailwind tokens in `frontend/src/index.css` (`@theme`). Use the token
  classes (`bg-accent`, `text-text-secondary`, `text-title`), never raw hex or
  pixel font sizes. Husky red accent on soft greens and grays, green for found,
  gold for the selected pin, pink for favorited hearts, blue for keyboard focus
  (ratings are ink stars); Bricolage
  Grotesque for headings, Atkinson Hyperlegible Next for body text, JetBrains
  Mono for secret codes; 8px corners on controls, 16px on cards
  (`rounded-full` only for pins, avatars, pill tags and the header's search
  and page pills).
