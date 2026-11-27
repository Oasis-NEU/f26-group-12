# CLAUDE.md

Claude Code reads this file at the start of every session in this repo. It holds the team's working rules for Claude. Project facts live elsewhere:

- `PROJECT_CONTEXT.md`: features, schema, routes and decisions (the source of truth)
- `PRODUCT.md`: who the app is for and what it must never do
- `DESIGN.md`: the design system (colors, type, components, motion)
- `.claude/skills/husky-geocaching/`: team conventions (git, Supabase, security); use it for any work here

## Building or rebuilding a page

Follow these steps in order for every page:

1. **Build** the page from its Figma section with the `frontend-design` skill. If the Figma connector is set up, use the Figma design-to-code skill to read the section. Use the components in `frontend/src/components` and the Tailwind tokens. The phone frame is the base styles; add `lg:` for desktop.
2. **Animate** it with the `emil-design-eng` skill, following the motion rules in `DESIGN.md`. Do this before the review, so the review checks the motion too.
3. **Review** it with one Impeccable audit (`/impeccable audit`) and one critique (`/impeccable critique`), then make the fixes the person picks. One round is enough. Later rounds mostly find smaller things, so only run another after a big change.
4. **Polish** it once with `/impeccable polish`, then commit and open a pull request.

## The prompt for building a page

To start step 1, copy this, fill in the parts in `<angle brackets>`, and send it to Claude:

```text
Use the frontend-design skill to rebuild src/pages/<PageName>.jsx from the
layout and notes in this Figma section:
<link to the page's Figma section, including ?node-id=...>
matching the look of src/pages/CacheDetailPage.jsx. <What's special about
this page: states and screens to include, Figma notes to follow, and how it
should behave, e.g. "After logging in, send people back to the page they
came from.">
Keep the existing Supabase data loading exactly as it is (if it's inside
the component, move it into a function in src/lib/ without changing
what it fetches), and replace the rest of the page. Use src/components
and our Tailwind tokens. The phone frame is the base styles; use lg:
for desktop. Never select secret_code. Tell me about any differences
from Figma when you're done.
```

When Claude gets this prompt, it should:
- start a new branch named `feature/rebuild-<page>` from an up-to-date `main` (see below);
- put the page's Supabase calls in `src/lib/` (one hook or file per page, like `useCacheDetail.js` and `useMapData.js`);
- finish by listing every difference from Figma and anything it couldn't check.

## One page per branch

- Each page gets its own branch, named `feature/rebuild-<page>`, e.g. `feature/rebuild-login-page` or `feature/rebuild-journal-page`. Start it from an up-to-date `main` (`git switch main`, `git pull`, `git switch -c feature/rebuild-<page>`).
- Changes that reach other pages don't go on a page's branch. That includes shared components, the header, routes and site-wide styles. Put them on a separate `feature/` branch. The one exception is the line in `frontend/src/components/Layout.jsx` that tells Layout the page draws its own header and `<main>`.
