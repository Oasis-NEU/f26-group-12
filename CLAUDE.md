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

## One page per branch

- Each page gets its own branch, e.g. `feature/rebuild-login-page`.
- Changes that reach other pages don't go on a page's branch. That includes shared components, the header, routes and site-wide styles. Put them on a separate `feature/` branch.
