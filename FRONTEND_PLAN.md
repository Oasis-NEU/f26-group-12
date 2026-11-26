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

Done: the Figma variables and text styles are in the `@theme` block of `frontend/src/index.css`, using Figma's code syntax names. If Figma changes, update that file (Figma wins).

- **Colors:** black, white, `#F5F5F5` neutrals, `#444444` secondary text, and Husky red (`accent` #C8102E, `accent/pressed` and `error` #A50D26, `accent/soft` #FCEBEE). Classes look like `bg-bg-page`, `text-text-secondary`, `border-border-subtle`, `bg-accent`.
- **Fonts:** Bricolage Grotesque (headings), Atkinson Hyperlegible Next (body text and the default) and JetBrains Mono (secret codes), from Google Fonts, loaded in `index.html`. Text style classes set font, size, line height, weight and spacing together: `text-display`, `text-title`, `text-heading`, `text-body`, `text-body-strong`, `text-body-large`, `text-label`, `text-small`, `text-action` (buttons), `text-code` (secret codes); desktop landing adds `text-hero` and `text-section`.
- **Spacing:** Tailwind's scale (`space/4` = 16px = `p-4`). **Corners:** square (`rounded-lg` and `rounded-2xl` are 0 on purpose); `rounded-full` only for pins and avatars. Use 1px outlines.

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
