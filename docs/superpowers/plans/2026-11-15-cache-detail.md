# Cache Detail Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the responsive Figma cache-detail screen at `/caches/:cacheId` with live, read-only Supabase data.

**Architecture:** Add focused data helpers for safe cache, current-user find-status, and one-at-a-time hint queries. Share the existing map header between the map and detail screens, then build the detail page around those helpers with local-only hint progression and explicit missing, inactive, and access-error states.

**Tech Stack:** Vite, React, Tailwind CSS, Supabase JS, `react-router`, Node's built-in test runner.

**Spec:** `docs/superpowers/specs/2026-11-15-cache-detail-design.md`

## Global Constraints

- Use the existing Vite + React + Tailwind CSS + Supabase stack and `react-router`.
- Do not submit finds, persist hint reveals, change the schema, or modify database permissions.
- Never select, display, or otherwise handle `secret_code`.
- Do not fall back to Figma sample content when live reads fail.
- Keep the existing map and landing-page changes intact.
- Do not inspect or edit credential files.

## Review Focus

- Cache reads must not request sensitive fields: assert the exact selected columns in the data-helper tests.
- Find status must not expose another user's records: test the anonymous no-query path and exact current-user/cache filters.
- A locked hint must not be fetched in advance: assert each hint query filters to only the requested `hint_order`.
- Missing records and database access errors must not look like live sample data: test null and rejected helper results and verify explicit page states.
- Inactive caches and already-found caches must not offer a misleading find action: verify their distinct page states in the desktop/mobile check.

---

### Task 1: Safe cache-detail data helpers

**Files:**
- Create: `frontend/src/pages/cacheDetailData.js`
- Create: `frontend/tests/cacheDetailData.test.js`

**Interfaces:**
- `loadCacheDetails(supabase, cacheId)` returns the matching cache or `null`; selects exactly `id,title,description,location_name,difficulty,image,is_active` and throws Supabase errors.
- `loadUserFindStatus(supabase, cacheId, userId)` returns a boolean; returns `false` without querying when `userId` is absent, otherwise selects only `cache_id` filtered by both `finder_id` and `cache_id`.
- `loadHint(supabase, cacheId, hintOrder)` returns the matching `{ hint_order, hint_text }` or `null`; queries only the requested hint order and throws Supabase errors.

- [ ] **Step 1: Write failing tests** named `cache detail query selects only safe fields`, `find status is scoped to the current user and cache`, `anonymous find status skips Supabase`, `hint query fetches only the requested order`, and `cache, find, and hint query errors are surfaced`. Assert exact `from`, `select`, `eq`, and single-row result behavior; assert `secret_code` is absent from the cache select.
- [ ] **Step 2: Run the focused tests** from `frontend/` with `node --test tests/cacheDetailData.test.js`; confirm failure because the helpers do not exist yet.
- [ ] **Step 3: Implement** the three named helpers in `cacheDetailData.js` using `.maybeSingle()` for each single-row lookup, returning `null` for missing rows and throwing errors.
- [ ] **Step 4: Run the focused tests** with `node --test tests/cacheDetailData.test.js`; confirm every helper contract passes.

### Task 2: Reuse the branded site header

**Files:**
- Create: `frontend/src/components/SiteHeader.jsx`
- Create: `frontend/src/components/layoutRoutes.js`
- Create: `frontend/tests/siteHeader.test.js`
- Modify: `frontend/src/pages/MapPage.jsx`
- Modify: `frontend/src/components/Layout.jsx`

**Interfaces:**
- `SiteHeader` owns the responsive desktop navigation and mobile menu, using the existing labels, `NavLink` active state, focus styling, and close-on-navigation behavior from `MapPage`.
- `isCacheDetailPath(pathname)` returns `true` only for a single-segment `/caches/:cacheId` path other than `/caches/new`.
- `Layout` hides its shared legacy header and uses a white page background only for the exact cache-detail route; `/caches/new`, `/caches/:cacheId/log`, and `/caches/:cacheId/edit` keep their existing layout.
- `MapPage` replaces its inline header with `SiteHeader` without changing map behavior.

- [ ] **Step 1: Write failing tests** that server-render `SiteHeader` and assert the brand, desktop nav labels, mobile menu control, and active Map link; test `isCacheDetailPath` for detail, `/caches/new`, `/log`, `/edit`, and unrelated paths.
- [ ] **Step 2: Run `node --test tests/siteHeader.test.js`** from `frontend/`; confirm the tests fail because the component and route helper are missing.
- [ ] **Step 3: Extract the current map header and `NavigationLinks`** to `SiteHeader.jsx`, preserving the existing brand, link labels, responsive breakpoints, mobile menu labels, active styles, and close-on-navigation behavior.
- [ ] **Step 4: Replace the map's inline header** with `SiteHeader` and use `isCacheDetailPath(pathname)` from `layoutRoutes.js` in `Layout`.
- [ ] **Step 5: Run `node --test tests/siteHeader.test.js` and `npm test`** from `frontend/`; confirm the focused tests and existing suite pass.
- [ ] **Step 6: Run `npm run lint` and `npm run build`** from `frontend/`; confirm the map still compiles and no existing route layout was broadened.

### Task 3: Responsive live cache-detail page

**Files:**
- Modify: `frontend/src/pages/CacheDetailPage.jsx`
- Create: `frontend/src/components/DifficultyMeter.jsx`
- Modify: `frontend/src/pages/MapPage.jsx`
- Create: `frontend/tests/cacheDetailPage.test.js`
- Create: `frontend/tests/difficultyMeter.test.js`
- Uses: `frontend/src/pages/cacheDetailData.js`, `frontend/src/components/SiteHeader.jsx`

**Interfaces:**
- Read the ID from `useParams()` and use `loadCacheDetails`, `loadUserFindStatus`, and `loadHint` from Task 1.
- Keep hint progression in React state; load hint 1 initially, and request only the next hint when the user chooses to reveal it.
- `DifficultyMeter({ difficulty })` clamps to levels 1–5 and renders the shared five-bar meter with the `Difficulty N` label.
- The primary action links to `/caches/:cacheId/log`; no find write is added.

- [ ] **Step 1: Write failing tests** for the SSR loading state and `DifficultyMeter`'s four filled bars, one empty bar, and label at difficulty 4.
- [ ] **Step 2: Run `node --test tests/cacheDetailPage.test.js tests/difficultyMeter.test.js`** from `frontend/`; confirm both fail before implementation.
- [ ] **Step 3: Extract the map's existing `DifficultyMeter`** to `frontend/src/components/DifficultyMeter.jsx`, update `MapPage` to reuse it, and verify the focused meter test passes.
- [ ] **Step 4: Replace the placeholder** with the Figma layout: back-to-map link, cache photo slot, title/location/difficulty/description, hints panel, and primary find action; verify the page loading test passes.
- [ ] **Step 5: Match mobile layout** with a 56px header, single-column content, and bottom-pinned action; match desktop with a 64px header, centered 1152px two-column content, 704px main column, and 400px hints card.
- [ ] **Step 6: Load only live safe data** for the route cache and signed-in user's find status; load hint 1 initially and later hints on demand. Subscribe to auth-state changes so find status is scoped to the current user while the page is open.
- [ ] **Step 7: Render explicit states:** loading, missing cache, query/access failure with retry, inactive cache with the find action hidden, already-found state, missing photo, unavailable hints, and hint-fetch errors. Never render Figma sample copy as fallback live data.
- [ ] **Step 8: Run `node --test tests/cacheDetailPage.test.js tests/difficultyMeter.test.js`, `npm test`, `npm run lint`, and `npm run build`** from `frontend/`; confirm tests pass and the responsive page compiles cleanly.

### Task 4: Verify the requested screen

**Files:**
- No new files.

- [ ] **Step 1: Open `/caches/:cacheId`** using the existing browser/dev-server configuration if available; check at 1440×1024 and 393×852.
- [ ] **Step 2: Verify the visual and state requirements** for desktop/mobile layout, no duplicate header, selected live cache image, sequential hint reveal, already-found/inactive action states, and no horizontal overflow.
- [ ] **Step 3: Run `git diff --check` and inspect `git status --short`** to confirm only scoped changes are introduced and existing landing/map work remains intact.
