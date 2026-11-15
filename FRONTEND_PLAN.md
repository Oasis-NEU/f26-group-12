# HuskyCache frontend plan

Read this together with `PROJECT_CONTEXT.md`. It explains where the design lives and how to improve the frontend. Supabase (queries, auth, security) is owned by a teammate: don't change data code unless asked.

## Current state

- Every page exists in `src/pages`, built from Figma's generated code without Claude. Expect hard-coded pixel sizes, raw hex colors, repeated markup instead of components, and `<div>`s used as buttons.
- The design is finished in Figma. The goal is to clean up the existing pages so they match it, use shared components and tokens, and work on phones first.

## Figma (source of truth)

File: "Husky Design". Use the Figma MCP to read these.

| What | Link |
|---|---|
| Foundations (variables, text styles) | https://www.figma.com/design/rIsduv9yYJCQ3ibM0ShhTQ/Husky-Design?node-id=104-2 |
| Components page | https://www.figma.com/design/rIsduv9yYJCQ3ibM0ShhTQ/Husky-Design?node-id=1-4 |
| Styled example (Cache detail) | https://www.figma.com/design/rIsduv9yYJCQ3ibM0ShhTQ/Husky-Design?node-id=110-96 |
| Map | https://www.figma.com/design/rIsduv9yYJCQ3ibM0ShhTQ/Husky-Design?node-id=109-2 |
| Cache detail (layout + notes) | https://www.figma.com/design/rIsduv9yYJCQ3ibM0ShhTQ/Husky-Design?node-id=109-3 |
| Log find | https://www.figma.com/design/rIsduv9yYJCQ3ibM0ShhTQ/Husky-Design?node-id=109-4 |
| Journal | https://www.figma.com/design/rIsduv9yYJCQ3ibM0ShhTQ/Husky-Design?node-id=109-5 |
| Hide a cache | https://www.figma.com/design/rIsduv9yYJCQ3ibM0ShhTQ/Husky-Design?node-id=109-6 |
| Log in | https://www.figma.com/design/rIsduv9yYJCQ3ibM0ShhTQ/Husky-Design?node-id=109-7 |
| Leaderboard | https://www.figma.com/design/rIsduv9yYJCQ3ibM0ShhTQ/Husky-Design?node-id=109-8 |
| Landing | https://www.figma.com/design/rIsduv9yYJCQ3ibM0ShhTQ/Husky-Design?node-id=109-9 |
| Not found | https://www.figma.com/design/rIsduv9yYJCQ3ibM0ShhTQ/Husky-Design?node-id=109-10 |
| My caches | https://www.figma.com/design/rIsduv9yYJCQ3ibM0ShhTQ/Husky-Design?node-id=109-11 |
| Edit cache | https://www.figma.com/design/rIsduv9yYJCQ3ibM0ShhTQ/Husky-Design?node-id=109-12 |
| Menus | https://www.figma.com/design/rIsduv9yYJCQ3ibM0ShhTQ/Husky-Design?node-id=109-13 |

- Each page section has a phone frame (393 wide) and a desktop frame (1440 wide). Phone is the base Tailwind styles; desktop uses `lg:`.
- Notes beside frames describe states and what changes on desktop. They are instructions, not page content.
- The Sketches sections set the layout; the styled Cache detail example sets the look for every page.

## Design tokens

Figma variables with code syntax. Add them to the Tailwind theme using the code syntax names.

- **Colors:** `bg/page` #F3F4F1, `bg/surface` #FFFFFF, `bg/subtle` #E8EAE5, `bg/inverse` #171B18, `text/primary` #171B18, `text/secondary` #565E54, `text/on-accent` #FFFFFF, `border/subtle` #D6DAD3, `border/input` #767E73, `border/strong` #171B18, `accent` #C8102E, `accent/pressed` #A50D26, `accent/soft` #FCEBEE, `error` #A50D26, `found` #2D6A4F, `found/soft` #E3F0E8, `highlight` #F2B33D, `highlight/soft` #FDF3DC, `focus` #1D5FAF.
- **Fonts (Google Fonts):** Bricolage Grotesque (Display, Title, Heading), Atkinson Hyperlegible Next (Body, Body Strong, Label, Small, Tag), JetBrains Mono (Code, for secret codes).
- **Spacing:** Tailwind's scale (`space/4` = 16px = `p-4`). **Corners:** 8px buttons and inputs (`rounded-lg`), 16px cards (`rounded-2xl`), full for pills and pins.

## Components (build in `src/components`, one file each)

Button (Primary/Secondary × Default/Hover/Focus/Disabled), TextField (Default/Focus/Error), DifficultyMeter (Level 1–5), StarRating (Value 0–5), HintRow (Locked/Revealed), CacheCard (Found × Default/Hover/Selected), MapPin (Found × Selected), NavBar (Desktop/Phone). Variants become props; Hover and Focus become `hover:` and `focus-visible:` classes.

## Rules

Stays as designed:
- What's on each page, the order, and the one main action. Red (`accent`) is only for that action and unfound pins.
- Difficulty is always bars plus "Difficulty N". Ratings are always gold stars.
- Wrong codes show an inline error under the field, not a new screen.
- "Cache hidden!" and "Find logged!" are states inside AddCachePage and LogFindPage, not routes.
- Contrast, tap targets of at least 44px, and real `<button>`/`<a>` elements. Input text at least 16px.
- Never select `secret_code` in the frontend.

Open to improvement (once, on Cache detail, then applied everywhere):
- How photos, cards, and the map are presented; small touches with personality.
- Hover effects, motion, loading and empty states.
- The landing page.

## Workflow for each page (one branch per page)

1. **Clean up** with the frontend-design skill: tokens instead of hard-coded values, shared components, phone-first layout, semantic HTML. Don't change how it looks or touch Supabase code.
2. **Review** with `/impeccable audit` and `/impeccable critique`; fix the findings the team agrees with.
3. **Motion** with the emil-design-eng skill, only where something moves: map card, hint reveal, logging a find, success screens, menus. Respect `prefers-reduced-motion`.
4. **Polish** with `/impeccable polish`, compare with the Figma section, then open a pull request.

Order: Cache detail → Map → Log find → Journal → Hide a cache → Log in → Leaderboard, My caches, Edit cache, Not found → Landing.

## Working with the Supabase teammate

- Data code belongs to them. Ask before changing what a page receives.
- Prefer queries in functions in `src/lib/` (for example `getCaches()`), so pages only call them.
- Whoever changes a table updates `supabase/schema.sql` and `PROJECT_CONTEXT.md` in the same pull request.
