> **Replaced (2026-11-26):** the cache detail page was rebuilt from the Figma section and styled example, so this spec no longer matches it (for example, it reveals Hint 1 by default). For the current design see `DESIGN.md` (Hint Trail, Contour Backdrop, Cache Photo, Place Label and Find Action) and the code in `frontend/src/pages/CacheDetailPage.jsx` and `frontend/src/pages/cacheDetail/`. Kept as a record of the original plan.

# Cache Detail Screen Design

## Intent

Implement Figma node 109:3 for `/caches/:cacheId` so Huskies can review a cache and reveal its hints before visiting it. Match the provided phone and desktop layouts while using live, read-only Supabase data.

## Goals and non-goals

- Show a cache photo, title, location, difficulty, description, ordered hints, and a clear find action.
- On desktop, use the 64px site header and a centered two-column detail/hints layout; on mobile, use the 56px header, a single-column body, and a bottom-pinned action.
- Reveal hint 1 initially; reveal later hints one at a time in page state only.
- Show an already-found state for the signed-in user and a taken-down state for inactive caches.
- Do not submit finds, persist hint reveals, change the schema, or modify database permissions.
- Never select, display, or otherwise handle `secret_code`.

## Approaches

1. **Live, read-only detail page (chosen):** fetch only required cache fields, the signed-in user's find status, and each next hint only when requested. Keep hint progression local and route the primary action to the existing `/caches/:cacheId/log` screen. This matches the user's live-data and read-only preferences.
2. **Static Figma sample:** easy to match visually, but would misrepresent sample data as live cache information.
3. **Persist hint reveals and find submission:** requires writes and potentially database changes, so it is outside this request.

## Constraints and implementation calls

- Use the existing Vite + React + Tailwind CSS + Supabase stack, `react-router`, and shared Supabase client.
- Read cache `id`, `title`, `description`, `location_name`, `difficulty`, `image`, and `is_active`; query only the current signed-in user's matching find status; request `hint_order` and `hint_text` only for the next hint being revealed.
- Do not fall back to Figma sample content when live reads fail. Explain unavailable, missing, inactive, or denied data states in the page.
- Use a cache's live `image` in the photo slot when present; show a neutral no-photo state when absent.
- Keep the existing map and landing-page changes intact. `Layout` should not render a duplicate header on this detail route.
- The project currently has no read policies for caches, hints, or finds. Surface read failures and do not change RLS or credentials.

## Verification

Add focused tests for safe query columns, user scoping, sequential hint reads, and unavailable records. Run `npm test`, `npm run lint`, and `npm run build` from `frontend/`; verify the target detail screen at desktop and mobile widths when the existing local configuration permits.
