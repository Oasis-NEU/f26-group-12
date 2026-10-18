---
name: husky-geocaching
description: Team conventions for the Husky Geocaching (HuskyCache) web app — a Northeastern geocaching site built with React + Vite + Tailwind and Supabase. Use this skill for ANY work in this repo, including writing or editing React components, Supabase queries, database/schema changes, SQL, Python backend code, git commits, explaining code to the team, or planning features like caches, hints, finds, journals, ratings, leaderboards, or messaging — even if the request doesn't mention conventions.
---

# Husky Geocaching — Team Conventions

The full project context lives in `PROJECT_CONTEXT.md` at the repo root. Read it before starting any feature or schema work. It is the source of truth for features, schema, and decisions. If this skill and that file disagree, the file wins; point out the mismatch so the team can fix it.

## Who you're working with

Most of the team is new to web development (mostly first-year students).

- Explain step by step. Say what a command or piece of code does and why, not just what to type.
- Prefer simple, readable code over clever code. A beginner should be able to follow it.
- Before a large change, describe the plan in plain language and wait for approval.
- When introducing a new concept (hooks, RLS, async/await, foreign keys…), give a one- or two-sentence explanation.

## Tech stack

- **Frontend:** React + Vite + Tailwind, in the `frontend/` folder.
- **Database:** Supabase (Postgres), accessed from React with `@supabase/supabase-js`.
- **Backend:** Python with a venv, in `backend/`. Its role is still being defined, so ask before putting logic there.
- Don't add new major libraries or frameworks without asking the team first.

## Database rules

- The SQL copy of the schema is `backend/supabase/schema.sql`.
- **Whenever a table, column, constraint, or policy changes, update BOTH `backend/supabase/schema.sql` AND the schema section of `PROJECT_CONTEXT.md`.** Remind the person to do this every time, and offer to make the edits.
- Every table has `id` (primary key) and `created_at` (`timestamptz`, default `now()`).
- **Caches are never deleted.** To take one down, set `is_active = false`. Never write code that deletes from `caches`.
- Store values once and calculate the rest. Cache count, a user's journal, and scores/leaderboards are calculated from `caches` and `finds`, not stored as columns.
- One find per person per cache (the `one_find_per_person` unique constraint). Handle that error kindly in the UI ("You've already logged this cache!").

## Security and privacy

- **Never commit `.env`.** Supabase URL and keys stay in `frontend/.env`, which must be in `.gitignore`. Never paste keys into code, commits, issues, or chat.
- **RLS is currently OFF** on all tables. That's fine for development, but warn about it when relevant, and don't let anyone treat the app as launch-ready until RLS policies exist.
- **`secret_code` is sensitive.** Don't build UI that displays it to finders. Long-term, code checking moves to a server-side Supabase function so the frontend never sees codes. Prefer designs that move toward that.
- **Don't store users' locations.** Any location check runs in the browser only and saves nothing.
- **Test data only** (fake accounts, test caches) until security is in place.

## Workflow

- Work is tracked in GitHub Projects. Plan at the start of each hack session.
- Never commit `.env` or other secrets; check `git status` before committing.
- Branches: one branch per feature, e.g. `feature/add-cache-form`. Don't push straight to `main`; open a pull request and have one teammate look at it.
- Commit messages: short and in present tense, e.g. `Add hint reveal button`.
- React: one component per file in `frontend/src/components/`, named in PascalCase (`CacheCard.jsx`). Pages go in `frontend/src/pages/`.
- Supabase client: create it once in `frontend/src/lib/supabaseClient.js` and import it everywhere else.
- Styling: Tailwind classes only, no separate CSS files unless there's a good reason.
