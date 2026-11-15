# Live Map Design

## Intent

Replace the placeholder map page with the responsive Figma map screen, populated from Supabase using read-only queries and rendered on Google Maps when the existing browser API key is configured.

## Goals

- Match the Figma desktop sidebar/map and mobile map/preview layout.
- Load active caches and the signed-in user's find IDs from Supabase.
- Refresh active cache fields every 30 seconds and refresh the signed-in user's own finds through filtered Realtime events.
- Support search, All / To find / My finds filters, cache selection, and map navigation.
- Never select or display `secret_code`, log credentials, or write to Supabase.
- Show usable empty, loading, and error states when configuration or access is unavailable.

## Non-goals

- Changing Supabase schema, RLS policies, grants, or Realtime publication settings.
- Editing or inspecting `.env.local` or any credential value.
- Creating or editing caches, finds, or other database rows.
- Reproducing Figma sample caches as live data.

## Constraints

- Use the existing Vite + React + Tailwind frontend and `react-router` conventions.
- Reuse the configured Supabase client and installed `@vis.gl/react-google-maps` package.
- Query only cache ID, title, coordinates, location name, and difficulty; query only the signed-in user's own `finds.cache_id`.
- The existing project context says caches/finds have RLS enabled without read policies. Supabase may therefore return an empty result until the project owner configures access. No policy changes are included here.
- Google Maps requires `VITE_GOOGLE_MAPS_API_KEY`; do not read or change its local value. Render a clear map fallback if it is absent or the map fails.

## Approaches

1. **Figma screen with sample data:** closest visual match but does not satisfy the request for live data.
2. **Live Supabase data on Google Maps (chosen):** matches the user's request and reuses installed dependencies; requires existing read access and configuration, handled with explicit fallback states.
3. **Live map plus database policy/schema changes:** could enable data access but exceeds the user's read-only/no-credential-change boundary and would require separate approval.

## Design calls

- Keep all map reads in small, testable helpers; select explicit columns and never request secrets.
- Never subscribe to cache-table events because the full-row Realtime payload could contain `secret_code`.
- Re-fetch active cache fields every 30 seconds; subscribe only to the signed-in user's filtered find events and re-fetch rather than using event payloads.
- Preserve the shared layout navigation on other routes and provide the map screen's own header on `/`.
