---
name: HuskyCache
description: Campus geocaching for Northeastern students, designed like a field guide you carry outside.
colors:
  bg-page: "#f3f4f1"
  bg-surface: "#ffffff"
  bg-subtle: "#e8eae5"
  bg-inverse: "#171b18"
  text-primary: "#171b18"
  text-secondary: "#565e54"
  text-on-accent: "#ffffff"
  border-subtle: "#d6dad3"
  border-input: "#767e73"
  border-strong: "#171b18"
  accent: "#c8102e"
  accent-pressed: "#a50d26"
  accent-soft: "#fcebee"
  error: "#a50d26"
  found: "#2d6a4f"
  found-soft: "#e3f0e8"
  highlight: "#f2b33d"
  favorite: "#d6336c"
  focus: "#1d5faf"
typography:
  hero:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "4rem"
    fontWeight: 800
    lineHeight: "4.25rem"
  section:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: "3.625rem"
  display:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: "2.5rem"
    letterSpacing: "-0.5px"
  title:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: "2rem"
    letterSpacing: "-0.25px"
  heading:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: "1.75rem"
  wordmark:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 800
    lineHeight: "1.75rem"
  body-large:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: "1.875rem"
  body:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5rem"
  body-strong:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: "1.5rem"
  action:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: "1.375rem"
  label:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: "1.25rem"
  small:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  tag:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: "1rem"
  code:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: "1.75rem"
    letterSpacing: "3px"
rounded:
  lg: "8px"
  2xl: "16px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
  "16": "64px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.text-on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "0 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.accent-pressed}"
  button-primary-disabled:
    backgroundColor: "{colors.bg-subtle}"
    textColor: "{colors.text-secondary}"
  button-secondary:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "0 20px"
    height: "48px"
  button-secondary-hover:
    backgroundColor: "{colors.bg-subtle}"
  button-secondary-disabled:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-secondary}"
  text-field:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "48px"
  hint-row-locked:
    backgroundColor: "{colors.bg-subtle}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "48px"
  hint-row-locked-hover:
    backgroundColor: "{colors.border-subtle}"
  hint-row-revealed:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  cache-card:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.2xl}"
    padding: "12px"
  cache-card-hover:
    backgroundColor: "{colors.bg-subtle}"
  found-tag:
    backgroundColor: "{colors.found-soft}"
    textColor: "{colors.found}"
    typography: "{typography.tag}"
    rounded: "{rounded.full}"
    padding: "3px 12px 3px 8px"
  map-pin:
    backgroundColor: "{colors.accent}"
    rounded: "{rounded.full}"
    size: "28px"
  map-pin-selected:
    backgroundColor: "{colors.accent}"
    rounded: "{rounded.full}"
    size: "40px"
  map-pin-found:
    backgroundColor: "{colors.found}"
    rounded: "{rounded.full}"
    size: "28px"
  nav-bar:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label}"
    padding: "0 24px"
    height: "64px"
  nav-bar-phone:
    backgroundColor: "{colors.bg-surface}"
    padding: "0 16px"
    height: "56px"
---

# Design System: HuskyCache

## Overview

**Creative North Star: "The Campus Field Guide"**

HuskyCache looks like a pocket field guide a student takes outside: calm, paper-toned pages, bold headings that name the place, and a few strong marks that say what to do next. Husky Red marks what's still out there to find, Found Green ticks off what you've found, and solid ink stars record how good it was. Everything else stays in the background so those marks read at a glance, on a phone, outdoors, in daylight.

Components are friendly and sturdy. Corners are softly rounded, borders are thin, and fills are plain. Targets are big enough to hit while walking (48px buttons, fields and hint rows; 28px stars). Type does the expressive work: Bricolage Grotesque gives headings a little character, and Atkinson Hyperlegible Next keeps everything people read and tap as legible as possible.

The look is confident but never official. HuskyCache is an unofficial student project, so it nods to campus life without borrowing a university's crests, seals or institutional layouts. It also stays away from two other directions: the dense, gradient-card look of a corporate dashboard, and the mascots, confetti and candy colors of a kids' game.

**Key Characteristics:**
- Sage-tinted neutrals: an off-white page, white surfaces, gray-green borders, near-black ink.
- Five meaning colors, each with one job: red (to find, the main action), green (found), gold (the selected map pin), pink (a favorite), blue (keyboard focus).
- Gently rounded controls (8px) and cards (16px); fully round only for pins, avatars, pill tags and the header's search and pages.
- Flat surfaces; only things that float above the page cast a shadow: map pins and overlays (popups, the map card, menus, the login dialog).
- Bricolage Grotesque headings, Atkinson Hyperlegible Next for everything else, JetBrains Mono only for secret codes.
- Mobile-first, built for one-handed, outdoor use; desktop is the same system with more room.

## Colors

A quiet sage-gray field with four saturated marks, each reserved for one meaning.

### Primary
- **Husky Red** (`accent`): the one main action on a page (the Primary button), unfound caches on the map, and the brand mark. Its darker step, **Husky Red Pressed** (`accent-pressed`), is the Primary button's hover. **Husky Red Soft** (`accent-soft`) is for light red backgrounds.

### Secondary
- **Found Green** (`found`): anything you've found. Found pins, the checkmark and the "Found by you" text. **Found Green Soft** (`found-soft`) is the pill behind "Found by you".

### Tertiary
- **Favorite Pink** (`favorite`, #d6336c): only a favorited heart, filled and outlined in it (4.6:1 on white). Not red, because red already means "to find" and the main action; an empty heart stays an ink outline.
- **Pin Gold** (`highlight`): only the ring around the selected map pin. Gold is a fill, never text; on white it's too light to read. (Ratings used to be gold; since 2026-11-28 stars are solid ink, which reads better in sun and fits the ink heart, and points earned sit on a plain white card.)

### Neutral
- **Page** (`bg-page`): the background behind everything, a barely green off-white.
- **Surface** (`bg-surface`): white cards, fields, panels and the nav bar, sitting on the page.
- **Subtle** (`bg-subtle`): locked hints, chips and hover fills.
- **Inverse** (`bg-inverse`): the rare dark fill, such as a selected chip.
- **Text** (`text-primary`): main text and filled difficulty bars; near-black with a hint of green.
- **Text Secondary** (`text-secondary`): supporting text, placeholders, metadata and disabled labels.
- **Text on Accent** (`text-on-accent`): white text on red or dark fills.
- **Border Subtle** (`border-subtle`): card outlines, dividers, empty difficulty bars and the locked hint's hover fill.
- **Border Input** (`border-input`): text field borders and locked hint row outlines, dark enough for 3:1 contrast.
- **Border Strong** (`border-strong`): Secondary buttons and the selected card.

### Utility
- **Error** (`error`): error text, the error icon and error borders. It shares Husky Red Pressed's value, but it's a separate token so errors can change without changing the brand.
- **Focus Blue** (`focus`): the keyboard focus ring, and nothing else.

### Increase Contrast
When someone turns on Increase Contrast (iPhone: Settings → Accessibility → Display & Text Size; code: `contrast-more:`; Figma: the Color collection's **Increase contrast** mode), faint edges darken so the page still reads in bright sun:
- **Border Subtle** takes Border Input's value: card outlines, dividers, legend rules, revealed hint borders and empty difficulty bars.
- **The hint trail's** dashes and locked rings darken to Text Secondary.
- **Purely decorative lines,** such as the contour rings, disappear.

Text, the meaning colors and the focus ring don't change; they already pass in sunlight.

**The Bright Sun Rule.** Anything that carries meaning must stay readable with Increase Contrast on. Anything that's only mood is allowed to vanish.

### Named Rules
**The One Meaning Rule.** Red, green, gold, pink and blue each mean exactly one thing. Never use them for decoration, for headings, or to make something "pop".

**The One Red Button Rule.** A page has at most one Husky Red button. Every other action is Secondary.

**The Links Go Places Rule.** A link takes you to another page and sits inside a sentence ("…on the cache's edit page."). Anything that does something (saves, prints, copies, adds, starts over) is a button, and so is anything standing on its own line. Actions step down in weight: Primary (one per page), then Secondary, then a quiet button with no outline for anything lesser. A page full of underlined links reads as clutter, so when one stands alone, make it a button.

**The Tokens Only Rule.** Use the token classes (`bg-accent`, `text-text-secondary`), never raw hex values.

## Typography

**Display Font:** Bricolage Grotesque (with ui-sans-serif, system-ui)
**Body Font:** Atkinson Hyperlegible Next (with ui-sans-serif, system-ui)
**Mono Font:** JetBrains Mono (with ui-monospace), for secret codes only

**Character:** Bricolage brings a friendly, slightly quirky voice to headings and the wordmark; Atkinson Hyperlegible Next is built so similar letters (I, l, 1; O, 0) never get confused, which matters for people reading on the move. All three load as variable fonts; Bricolage also uses its optical-size axis, so big headings get its display letterforms automatically.

### Hierarchy
- **Hero** (800, 64px, 68px line height): the desktop landing page headline only.
- **Section** (800, 48px, 58px): desktop landing page section headings.
- **Display** (800, 36px, 40px, -0.5px tracking): page titles on phones and compact views, such as "Nearby caches".
- **Title** (700, 24px, 32px, -0.25px): the name of the thing a page is about, such as a cache or place ("Krentzman Quad"). Card titles in lists use Body Strong instead.
- **Heading** (700, 20px, 28px): section headings in a page, such as "Hints"; also the phone wordmark and phone menu links.
- **Body Large** (400, 20px, 30px): larger reading text. No component uses it yet.
- **Body** (400, 16px, 24px): default reading text and input text.
- **Body Strong** (700, 16px, 24px): emphasis in body text, card titles and the locked hint name.
- **Action** (700, 18px, 22px): larger button text. The Button component uses Label; no component uses Action yet.
- **Label** (700, 14px, 20px): button text, field labels and "Difficulty N".
- **Small** (400, 14px, 20px): help text, locations, metadata and "Tap to reveal".
- **Tag** (700, 12px, 16px): small pills like "Found by you".
- **Code** (JetBrains Mono 700, 20px, 28px, 3px tracking): secret codes.

### Named Rules
**The Three Voices Rule.** Bricolage for headings and the brand, Atkinson for everything people read and tap, JetBrains Mono only for secret codes. Never a fourth face.

**The 16px Floor Rule.** Text people type is at least 16px, so phones don't zoom in.

**The Text Style Rule.** Each text style class sets the font, size, line height, weight and tracking together. Use the class (`text-title`), not raw pixel sizes.

## Layout

Each screen is designed twice in Figma: a phone frame (393px) and a desktop frame (1440px). Phone styles are the base and desktop styles are added at a breakpoint. The components switch at Tailwind's `md` breakpoint (768px). Pages currently mix `md:` and `lg:` (1024px), and the team doc says `lg:`; this is not yet settled.

Spacing follows Tailwind's 4px scale, and Figma's spacing variables are the same steps (4, 8, 12, 16, 20, 24, 32, 48, 64). Phone layouts use a 16px side margin; the nav bar runs edge to edge, with the logo 24px in on desktop (16px on phones), while desktop page content keeps 10% side margins (144px at 1440px). Content columns stay narrow enough to read: list pages max out around 800px and long body text around 640px. Content is left-aligned.

**Detail pages** use two columns on desktop: a flexible main column, and a 400px card on the right that stays in view while the page scrolls, 48px apart. On phones the card's contents flow under the main column, and its main action moves to a bar pinned to the bottom of the screen.

## Elevation & Depth

The system is flat. Depth comes from tonal layering: white surfaces on the off-white page, separated by thin gray-green borders. Shadows are kept for the few things that float above the page: map pins, so they stand out from the map underneath, and overlays such as popups, the map card, menus and the login dialog.

### Shadow Vocabulary
- **Pin** (Figma style "Shadow / Pin"; code `shadow-pin`; `box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.2)`): map pins, and a control floating over a photo (the Favorite Button's white circle on a cache card's photo), which sits on a picture rather than the page.
- **Overlay** (Figma style "Shadow / Overlay"; code `shadow-overlay`; `box-shadow: 0 6px 20px 0 rgb(23 27 24 / 0.14)`): popups, the map card, menus such as the account menu, and the login dialog.

### Named Rules
**The Flat Field Rule.** Cards, buttons and fields never cast shadows. If something needs to stand out, give it a border or a fill. The one exception is a control floating over a photo, which has no page under it to stand out from: it takes the Pin shadow.

## Shapes

Corners are gently rounded: 8px (`rounded-lg`) for buttons, fields, hint rows and the phone menu button; 16px (`rounded-2xl`) for cards. Fully round (`rounded-full`) is only for map pins, avatars, pill tags, the small error dot, the header's search field and page pills, and icon buttons (the Favorite Button).

Borders are 1px. Where Figma draws a 2px border (the selected card, the error field), the code uses a 1px border plus a second 1px line just inside it, so the element looks the same but doesn't grow by a pixel when its state changes. Most use an inset ring; the cache card uses an outline (offset 2px inward), because its photo would cover a ring.

## Components

### Buttons
Big, friendly and plain.
- **Shape:** gently rounded (8px), 48px tall, 20px side padding; width hugs the label, or fills on phones (`fullWidth`).
- **Primary:** Husky Red with white Label text. Hover is Husky Red Pressed. One per page.
- **Secondary:** white with a 1px Border Strong outline and dark text. Hover fills with Subtle.
- **Disabled:** Primary turns Subtle with Text Secondary; Secondary keeps white with a Border Subtle outline and Text Secondary.
- **Focus:** the shared focus ring (2px Focus Blue, 2px white gap). Hidden for mouse clicks.
- **Press:** an enabled button shrinks to 97% while pressed (160ms, the shared ease-out), so a tap feels heard. The shrink stays with reduced motion on; only its animation is dropped.
- **Element:** a real `<button>`, a router link (`to`) or an `<a>` (`href`).

### Chips
- **Found tag:** a Found Green Soft pill with a small green check and "Found by you" in green Tag text (3px vertical padding, 8px left, 12px right).

### Cards / Containers
- **Cache card:** the title is the card's link (or select button), stretched over the whole card, so clicking anywhere opens it while the Favorite Button in the top-right corner (8px from the right, so hearts line up down a list) stays its own button; hover, press and the focus ring show on the whole card. White, 1px Border Subtle outline (Border Input with Increase Contrast), 16px corners, no shadow. The photo of the spot runs across the top, 3:1, flat on purpose: the map list is for choosing a cache, so several should fit on screen. The Journal's Favorites use the Journal's look instead (2:1 on phones, 3:1 on desktop, 16px padding, 20px on desktop), so they match its finds. On a photo the Favorite Button sits 8px from the top too, on a white circle with a faint ink edge (Text at 15%, Border Input with Increase Contrast) and the Pin shadow, so it reads on bright sky and stone too. With no photo it's centred on the title's first line instead, so the heart and the name sit level. Without a photo there's no photo area, as with the Journal's finds: the card starts with the name. A photo that won't load leaves no photo area either, unless it breaks while its band is already on screen, when the empty Subtle band stays so the list doesn't jump. The browser doesn't send photo sites the page address (no-referrer), since the photo's address comes from whoever hid the cache. Then, 12px in: the title in Body Strong (full width), the place (Small, Text Secondary) with the found tag after it, then a line with the difficulty meter and the Rating Summary, 12px apart, which fits on one line in the 400px desktop list. Selected adds a 1px Border Strong outline just inside the edge (so it reads as 2px over the photo too) and the Subtle fill (so it still shows where a dark photo swallows the edge). Motion: the hover fill and the selected outline ease in (150ms), the photo dims to 95% brightness while the card is hovered (150ms), and a clickable card shrinks to 98% while pressed. A photo fades in over its Subtle band as it arrives (200ms); one the browser already has (a card coming back after a filter change) just shows. The list doesn't animate when a search or filter changes it.
- **Hover:** fills with Subtle (only when the card is a link or button).
- **Selected:** the outline becomes Border Strong, drawn 2px thick. It matches the pin someone clicked on the map.

### Inputs / Fields
- **Style:** label (Label) above a 48px white box with a 1px Border Input outline, 8px corners, 16px padding and 16px Body text. Placeholder is Text Secondary. Help text (Small) sits below.
- **Focus:** the shared focus ring.
- **Error:** the outline turns Error and is drawn 2px thick; the help text becomes the error message in Error, with a small round "!" icon. Errors appear under the field, never on a new screen.
- **Action (optional):** a 40px button inside the box at its right edge, 4px in, such as the eye that shows a password (Text Secondary icon, Text on hover). The text stops short of it.

### Navigation
- **Nav bar:** a white bar with a 1px Border Subtle bottom line, 64px tall on desktop and 56px on phones and tablets (it switches at 1024px, like the pages). On every page, including the ones not rebuilt yet.
- **Logo:** at the far left (24px in on desktop, 16px on phones), not on the page's content margin. The mark is a Husky Red map pin with a white cache box in its head (lid, body and a latch in the pin's red, `components/Logo.jsx`), meaning "a cache hidden at a spot"; red because a red pin is a cache to find. Beside it, the HuskyCache wordmark (Wordmark on desktop, Heading on phones). The browser tab icon (`public/favicon.svg`) is the same drawing. It replaced the red square "N", which looked too much like Northeastern's own mark.
- **Search (desktop):** after the logo, a 40px fully round white field with a Border Input edge and "Search caches", filling all the space between the logo and the pages (24px short of "Map"). The magnifier at its start is the search button. The search is kept in the address bar (`/map?q=…`). Phones and tablets use the map's own search box.
- **Suggestions:** as you type, a floating box (white, 16px corners, Border Subtle edge, Overlay shadow, 8px below the field, as wide as it) suggests up to 5 caches ("Caches": name, with the place under it) and up to 3 places hiders named ("Places": "Near Snell Library", "2 caches here"), with the typed text in bold. A cache opens its page; a place shows its caches on the map; when there are more matches than it lists, a last row (under a divider) shows them all on the map. Each row is 48px with a 32px round Page-coloured icon (box, pin, magnifier); the row the arrow keys or mouse are on gets the Subtle fill. Arrow keys move through it, Enter picks, Escape closes; it doesn't animate, since typing opens it. Nothing matching says so and suggests trying part of a name or a place. Street addresses aren't searched yet (that needs a geocoding service; planned with the map work). Without a pick, Enter on the map moves to the first match, and anywhere else goes to the map showing the matches ("Enter" hint at the end of the field). On the map the number of matches is also read out to screen readers once typing pauses. The suggestions load only id, title and place, never secret codes.
- **Pages (desktop):** Map, Hide a cache, Journal, Leaderboard as 40px fully round pills in Label text, 4px apart. The current page is Text on the Subtle fill (plus a Border Input edge with Increase Contrast); the others are Text Secondary and darken to Text over a paler Page fill on hover (150ms). No underline: they're places you can be, not links (The Links Go Places Rule). "Map" goes to the plain map, so on a search it also clears it. On the Log in page the header leaves out its own "Log in". Then the avatar (40px) or "Log in" as a 40px Secondary button, so everything in the bar is one height.
- **Account menu (desktop):** the avatar (named "Account menu for <username>") opens a small panel: name and points, "My caches", "Log out". It's a simple show/hide panel, not an arrow-key menu. A click outside, Escape (focus goes back to the avatar) or tabbing out of it closes it. The name and points are remembered between pages, so the avatar doesn't blank on each page.
- **Phone:** a 40px menu button (8px corners, Border Subtle outline) that opens the same pages full screen in Heading text. The current one has the Subtle fill and a 4px ink bar at its left, so it shows in sun. Then the account, or "Log in" as a full-width Secondary button. While it's open, focus starts on the first page, the page behind can't be tabbed to or scrolled, and Escape, a page change or widening past 1024px closes it.
- **Motion:** the account menu fades in and grows from 97% out of the avatar's corner (150ms); the phone menu fades in and drops 4px (200ms), and the menu button's icon pops in from 75% as it swaps (150ms). Closing is instant. Page pills, the avatar, the menu button and the search's clear button shrink to 97% when pressed. Moving between pages doesn't animate, and nor does the clear button appearing as you type. With reduced motion the menus only fade.

### Difficulty Meter
Five 7 × 14px bars, 3px apart: filled bars in Text, empty ones in Border Subtle, followed by "Difficulty N" in Label. The label can be hidden visually but always stays for screen readers.

### Star Rating
Five 28px stars with 8px gaps, using Figma's exported star images recoloured (filled stars are solid ink; empty ones are Border Input outlines). When picking a rating, each star is a button, and hovering with a mouse previews that rating.

### Favorite Button
A cache's heart, for adding it to your favorites (they stay favorites after you find them). The heart is never red, since red already means "to find": an ink outline when it's not a favorite, solid Favorite Pink when it is (the only place pink is used), 20px. Filled stars are ink: ink is the app's neutral "yes" mark, not a meaning colour.
- **Icon (cards, the map's popup and phone card):** a 40px round button; hover fills it with Subtle and pressing shrinks it to 97%. Screen readers hear "Favorite Krentzman Corner" with pressed on or off. In a cache card it sits in the top-right corner (8px from the right; see Cache card); in the popup and phone card it sits beside ×, 8px apart, so their tap areas don't overlap.
- **Labelled (the cache page):** a 40px outlined button (Border Strong, 8px corners) with an 18px heart and "Favorite" / "Favorited" in Label text, right after the cache's name (on a long name it drops to the next line). Not on a taken-down cache.
- **States:** while we're checking who's logged in or loading their favorites, the heart shows but can't be pressed (no hover or press). Signed out, it's a button that opens the Login Dialog ("Log in to add Krentzman Corner to your favorites."); once they've logged in, that cache becomes a favorite by itself: the heart they tapped fills (with its pop) as soon as their favorites have loaded, and focus goes back to it (if that heart is gone, the first one for that cache that's on screen does it, never a hidden copy). If they close the dialog instead, nothing changes. Tapping flips the heart at once; quick taps are sent one at a time, newest last. If it fails, it flips back and a small Inverse note ("Couldn't add it to your favorites. Try again.") shows under the button that was tapped, for 4 seconds, and is read out.
- **Motion, only after a tap:** the fill eases in or out (150ms) and adding pops the heart in from 75%; the failure note fades in and grows from 97% out of the button's corner. Hearts already filled when a page loads just appear. With reduced motion only the fill and the fade stay.

### Rating Summary
A cache's average rating, wherever it's listed: one 14px solid ink star (like the Star Rating's filled stars), the average to one decimal in bold Text, and the number of ratings in Text Secondary, all in Small: "★ 4.6 (12)", or "★ 4.6 (12 ratings)" on the cache page. A cache nobody has rated says "No ratings yet" (Small, Text Secondary). If the ratings couldn't load, nothing is shown, so a cache never looks unrated by mistake. On the cache page it fades in (150ms), since it arrives after the rest; on the map's cards it doesn't, since it comes with them. Screen readers hear "Rated 4.6 out of 5 from 12 ratings". The numbers come from the `cache_ratings` database function: totals only, never who rated what.

### Hint Row
Every hint starts locked, including Hint 1, so nothing is given away before someone asks. Hint 1 loads with the cache, and after each reveal the next hint loads quietly in the background but stays locked, so revealing is instant even on a weak signal. Revealed hints are remembered for that browser tab (sessionStorage: on the phone only, no location, gone when the tab closes), so they come back if the tab reloads, e.g. on the way back from Google Maps.
- **Locked:** a 48px Subtle row with a 1px Border Input outline (drawn inside the row, so it stays 48px; the fill alone barely shows against the page in sun) and "Hint N" in Body Strong and "Tap to reveal" in Small ("Click to reveal" with a mouse or trackpad, going by the device's pointer rather than the screen width). It grows taller if someone enlarges their text, rather than letting the words spill out. Hover darkens it to Border Subtle. While the hint loads it says "Revealing…" and can't be pressed. When an earlier hint is still locked, it says "Reveal hint N first" and can't be pressed, but it stays reachable by keyboard and screen readers (`aria-disabled`, not `disabled`). If a hint takes over 10 seconds to load, the row gives up with "That hint is taking too long. Check your signal and try again." and focus returns to it. Pressing shrinks it to 98%.
- **Revealed:** a white box with a 1px Border Subtle outline: "Hint N" in Small, then the hint in Body. When revealed by a tap it fades in and rises 4px (200ms, the shared ease-out), and focus moves to it, so screen readers read it. With reduced motion on it only fades. Hints already open when the page loads just appear.

### Map Pin
- **Unfound:** a 28px Husky Red circle with a 2px white border and the pin shadow.
- **Found:** a 28px Found Green circle with a white check (Figma's exported image).
- **Selected:** grows to 40px with a 4px Pin Gold ring.
- **Hover:** clickable pins (a pin button, or a pin inside a map marker) grow to 110%, animated only when reduced motion is off. Decorative pins, like the one on the empty photo frame or at the end of the hint trail, stay still: growing on hover promises a click.

### Hint Trail
The cache's hints drawn as a path. Each hint has a 24px marker: filled ink once revealed, an ink ring for the next one to open, and a Border Input ring for later ones. Between markers, the line is solid ink where you've been and dashed Border Input ahead. Past the last hint, the trail ends at the cache's map pin, beside "I found it" on desktop. The pin turns Found Green once you've found it, and the whole trail turns solid. On phones the pin sits alone at the end; the button stays in the bottom bar. When you tap to reveal the next hint, the solid line draws itself down to it (250ms, starting 100ms after the hint appears, so about 350ms in all); with reduced motion on it switches instantly. Only that tap animates: segments that are already walked when the page loads, or that turn solid because the found check arrives, just appear solid.

### Contour Backdrop
Faint topographic rings (1px Border Subtle) centred on the cache's spot (the empty frame's pin, the mini map's pin, or the middle of the photo), so the cache sits at the top of a "hill" like a marked spot on a trail map. They sit behind all content and fade out with distance, so the hints and text sit on plain page. They're decoration only: no information lives in them, and they disappear with Increase Contrast.

### Cache Photo
- **With a photo:** the photo fills the column, 180px tall on phones and 400px on desktop, with 16px corners. It has no pin on it: a pin on a picture could be read as "the cache is hidden here in the scene". The contour rings are centred on the photo instead.
- **No photo, with a map:** when Google Maps is set up (the same key as the map page) and the cache can still be hunted, a small still map of the spot takes the photo's place, the same size as a photo. The cache's own MapPin sits at the exact spot with the contour rings centred on it, and there's no corner pin. It's a picture, not a control: it can't be dragged, zoomed or tabbed into, and screen readers skip it, since the location is written just below and "Get directions" is the thing to press. Google's logo and credits stay visible.
- **No photo yet** (no map key, Maps failed to load, or taken down): a shorter see-through frame (120px on phones, 240px on desktop) with a 2px dashed Border Input edge and 16px corners. Dashed means "not reached yet", as on the hint trail, and the contour rings show through around the pin, so it reads as an unphotographed spot on the map. It says "No photo of this spot yet" (Body Strong) and "Use the location and hints to find it." (Small, Text Secondary). The location isn't repeated there, since it's shown just below. With Increase Contrast the edge darkens to Text Secondary.

### Place Label
On a cache's page, its name is set like a map label: Display on phones, Section on desktop. Location, difficulty and the Rating Summary (long form, left out on a taken-down cache) sit beneath it in a legend strip between two thin Border Subtle rules. The location is the strongest line in the strip (Body Strong, Text), since it's what people act on outdoors. Its first letter is shown capitalized ("Near Snell Library"), however the hider typed it. Under the strip comes the hider's description (Body, the hider's own clue, so it stays with the place facts), then a Secondary "Get directions" button opens Google Maps walking directions to the cache's coordinates (full width on phones, hugging its label on desktop). It's a plain link, so it needs no API key and stores nothing, and it's hidden when a cache has no valid coordinates.

### Find Action
The one main action on a cache's page: beside the trail's end pin on desktop, in the bottom bar on phones. It's always 48px tall.
- **Checking:** while the page finds out whether you've found or hidden this cache, a plain 48px Subtle placeholder holds the space, so "I found it" never flashes before "Found by you".
- **Not found yet:** the Primary "I found it" button.
- **Found:** a Found Green Soft line with a green check, "Found by you on Oct 30, 2026" (with the year, so it stays clear over time).
- **Your own cache:** a Subtle line, "You hid this cache", with an "Edit cache" link. Hiders know the code, so the page doesn't offer to log their own cache, and all their hints are shown.
- **How-to line:** while someone can still log the cache (not found yet, not their own), a Body, Text line under the trail's end says what to do at the spot before leaving (the whole find depends on it, so it isn't faint help text) (in the page on phones, not the sticky bottom bar, which stays just the button): "Note the 6-character code on the slip inside, then put the cache back." It stays on the cache's page, not the log page, because the code has to be noted while the cache is in hand. Signed-out visitors also see "Log in to log your find." (Small, Text Secondary), 8px below it so it reads as its own line. "Log in" opens the Login Dialog, so it's a button dressed as the sentence's link (28px tap area); after logging in, the page shows "I found it".

### Taken-Down Cache
A cache that's been taken down can't be hunted. The database only lets its own hider read it, so everyone else gets the not-found notice ("We couldn’t find that cache. It may have been taken down, or the link is wrong."). The hider sees "You took this cache down, so finders can’t see it or log it." with an "Edit cache" link, right under the title (anyone else who could ever see it gets "This cache has been taken down, so it can’t be logged anymore."); the hints, the find action, "Get directions" and the red pin are all left out; and an empty photo frame just says "No photo of this spot".

### Map Page
The home of hunting: phones get a full-screen map with search and the filters floating on top; desktop gets a 400px list panel on the left (on the Page colour, with white cache cards) and the map on the right, and searches from the header. The panel is headed "Caches near campus" (Display on phones, Title on desktop; over the phone map it's for screen readers only).
- **Filter chips:** All / To find / My finds / Favorites, shown only to logged-in people, and kept in the address (`?show=favorites`, for example), so coming back from a cache keeps the filter. On phones the List button is icon-only under 400px, and if the chips still don't fit they scroll sideways with the right edge fading while there's more. In Favorites, a cache you unfavorite stays (with an empty heart, so you can tap it again) until you change the filter. With none it says "You haven't added any favorites yet. Tap the heart on a cache to add it."; while loading, "Loading your favorites…"; if they couldn't load, "Your favorites couldn't load. Try again"; and if your favorites aren't on the map (taken down, say), "None of your favorites are on the map right now." 32px tall, 8px corners, Label text; white with a Border Strong edge, or the Inverse fill with white text when selected.
- **List / Map chip (phones):** the same chip look, at the end of the filter row. It swaps the map for the list of cache cards and back.
- **Selecting a cache:** a pin or a card selects it. On phones a card opens under the map (the map shrinks, so Google's logo and terms stay visible): title in Heading, location, difficulty with the Rating Summary beside it, find status for logged-in people, and the Primary "View cache". On desktop a small popup (Overlay shadow, 16px corners, title, difficulty and Rating Summary) opens beside the pin, and its card in the list gets the selected outline. Opening moves focus into the popup or card; × or Escape closes it and puts focus back. A pin click doesn't move the map; a list click pans to the cache and zooms in to 16 if needed.
- **Map controls:** "Show my location", "Back to campus" and, on desktop, zoom: white, Border Strong edge, 8px corners, 48px on phones and 40px on desktop, stacked bottom-right above Google's terms line.
- **Position dot:** a 16px Text (ink) dot with a 3px white ring and the Pin shadow, never Focus Blue (blue only ever means keyboard focus). It appears only after someone presses "Show my location", follows them as they walk, and stays in the browser: HuskyCache never saves or sends it.
- **No map** (no key, a failed load, or a key Google rejects): phones show the list instead, and desktop says why the map is missing.

### Log In Page
`/login` holds every way in on one page, picked by `?mode=`: Log in, Log in with a code, Create your account, Reset your password and Set a new password, plus "Check your email" after sign-up or a reset request. Its screens are shared with the Login Dialog (`components/login/LoginScreens.jsx`), so the two always match. The header's "Log in" (and the phone menu's) still comes here, and every emailed link (confirm, reset, the code email's link) lands here.
- **Layout:** phones show the form on the page, 40px below the header, with the switch line ("Not a member? Join now") at the bottom of the screen. Desktop puts it in a 448px white card (16px corners, Border Subtle edge) 80px below the header, with the switch line inside the card. The form starts a fixed distance from the top rather than being centred, so it doesn't jump between screens or when the phone keyboard opens. Headings are centred: Title on phones, Display on desktop.
- **Busy button:** while a form is working, its Primary button stays red, says what it's doing ("Logging in…") and ignores more presses (`aria-disabled`). A grey button reads as broken in sunlight.
- **Or divider:** "or" in Small Text Secondary between two Border Subtle lines, separating the Primary action from a Secondary alternative ("Email me a code instead").
- **Text links:** bold Text, underlined 4px below the text, with a 28px tap area; the underline thickens on hover.
- **Errors:** under the field they're about, as everywhere ("That email and password don't match."). A whole-form problem, like no connection, sits under the button.
- **After logging in:** people go to `?next=` (paths on this site only), otherwise back to the page they came from, otherwise the map.
- **Motion:** switching screens fades the new one in with a 4px rise (200ms, shared ease-out), like a hint being revealed; with reduced motion on it only fades, and the first screen doesn't animate. Focus moves to the new screen's heading.

### Login Dialog
Logging in without leaving the page: the Log in page's own screens (log in, log in with a code, create your account, reset your password, and "Check your email"), switched inside the dialog. Setting a new password stays on the Log in page, where the emailed link lands. One dialog serves the whole app (`LoginDialogProvider`, opened with `useLoginDialog().openLogin(...)`).
- **Opens from:** the heart when logged out (and then favorites that cache), the in-page "Log in" buttons ("Log in to log your find", "Log in to see where you rank", "Log in again" when a login runs out on Hide a cache, Log a find and the Journal, and the old My caches and Edit cache notices), and the pages that need an account. The header's "Log in" stays a link to the Log in page.
- **Phones:** a white sheet from the bottom with 16px top corners, only as tall as what's on it (at most the screen's height less 48px), so the page they were on still shows above it and a tap there closes it. It scrolls inside when it's taller than the screen and keeps the safe-area inset at the bottom.
- **Desktop:** a 448px white card (16px corners, Border Subtle edge, 32px padding), like the Log in page's card, as tall as its screen, 96px from the top. Not centred, so it doesn't jump when the screen inside changes.
- **Both:** the Overlay shadow over a dimmed page (Inverse at 40%). The top row has a 40px × ("Close") that shrinks to 97% when pressed. Headings are Title on phones and Display on desktop, centred, as on the page. Right under the heading, in Body Text, a line says what they were doing, naming the cache where there is one: "Log in to add Krentzman Corner to your favorites." on Log in, "Create an account to …" on Create your account, "Your login ran out. Log in again to save your find." when a login ran out. The pages that need an account leave it out, since their own heading already says it. The switch line ("Not a member? Join now") comes right under the form. The email they typed is kept while they stay on the page, so closing by mistake doesn't mean typing it again (passwords never are).
- **Behaviour:** a native modal `<dialog>`: focus stays inside, the page behind can't be reached or scrolled, and screen readers hear a dialog named by its heading (with the reason as its description). Focus starts on the heading (on a phone, focusing the email field would cover the sheet with the keyboard), and each screen switch moves it to the new heading. Escape, × and a click on the dimmed page close it (a press that starts in a field and ends outside doesn't). Leaving the page closes it too. Logging in closes it by itself and finishes what they were doing; focus goes back to what opened it, or to the page's main content if that's gone. Only a real login counts: Supabase announcing the same login again (when the tab comes back into view) or a password-reset link's login in another tab doesn't close it.
- **After sign-up:** "Check your email" shows in the dialog and says what happens next: "Open it to confirm your account, then come back to this tab to add Krentzman Corner to your favorites." There's no big "Log in" button (logging in before confirming only fails); small lines offer "Send it again", "Use a different one", and "Confirmed on another device? Log in". The confirmation link opens the Log in page, which logs them in in that browser, and this tab notices too: the dialog closes and finishes what they were doing. The Log in page's own "Check your email" works the same way, without the task.
- **Motion:** opening is something someone did, so it shows where the dialog comes from. The phone sheet slides up from the bottom edge (250ms; a sheet has further to travel than a menu) and the desktop card fades in and grows from 97% out of its centre (200ms), both on the shared ease-out, while the dimmed backdrop fades in alongside. Closing is instant, like the menus: once they've closed it or logged in, the page is back at once. Switching screens inside reuses the Log in page's fade with a 4px rise (200ms); the first screen doesn't animate. With reduced motion the sheet and card only fade.
- **Pages that need an account** (Hide a cache, Log a find, Journal): signed-out visitors stay on the page, which shows a calm signed-out message (a heading where the page has none, a sentence, and a Primary "Log in"), and the dialog opens over it straight away. Closing it leaves that message, and "Log in" opens it again, so nobody is trapped. Once they log in, the page carries on by itself.

### Log a Find Page
`/caches/:cacheId/log`, where "I found it" leads. At the cache it asks for one thing, the slip's secret code; the `log_find` database function checks it, and the page never sees the real code. The rating and journal note come after, on "Find logged!", so the phone keyboard's Go can't send the find before a rating.
- **Layout:** one 448px column. Phones pin "Log find" to a full-width bar along the bottom of the screen; desktop puts "Log find" and a Secondary "Cancel" under the form.
- **Secret code box:** 56px tall, the code in Code (JetBrains Mono, upper case). Help: "6 letters and numbers, written on the slip inside the cache." Before sending, it checks for 6 characters and none of 0, O, 1, I or L, with a message saying exactly what's wrong.
- **Wrong code:** stays on the page, keeps what they typed, outlines the box in Error and shows "That code doesn't match. Check the slip inside the cache and try again." with the "!" icon. The message fades in and the outline eases to red (150ms).
- **States:** each has its own heading: "This is your cache" (hiders can't log their own), "You took this cache down", "This cache was taken down", "You've already found this cache" (with the date), and "Log in again to save your find" if the login runs out mid-form, which keeps the code for that tab; its "Log in" opens the Login Dialog and the form comes back with the code. Signed-out visitors stay on the page: "Log in to log your find" ("Your finds and points are saved to your account. Log in, then enter the code from the slip.") with the Login Dialog open over it (see Login Dialog → Pages that need an account). If "Log find" gets no answer within 15 seconds, it says to check the signal.
- **Find logged!:** one of the app's two celebrations (with "Cache hidden!"), made to look like the cache's spot on the map turning to found. The Found Green MapPin at twice its map size (56px) sits at the top of contour rings, like the cache page's backdrop; the rings fade out just below the pin, so no line runs behind the text, and they don't animate. Then "Find logged!" in Display, the cache name in Title, "Found by you on Nov 27, 2026" in Label, Found Green, and the points earned on a white card with a Border Subtle edge (Border Input with Increase Contrast) ("+3 points", Heading; "You now have 11 points.", Small).
- **Add it to your journal:** a white card under the points, optional: Star Rating (with Clear) and "Journal note" (112px; "N characters left" in its last 50 characters). A Secondary "Add to journal" appears once there's something to save; then "Added to your journal."
- **Where next:** "Back to the map" is the Primary button (getting people to the next cache comes first), "See your journal" is Secondary.
- **Motion:** the pin grows in from 90% (250ms), then the points and the journal card rise 4px (200ms, from 100ms), all done by about 300ms on the shared ease-out. With reduced motion they only fade.

### Hide a Cache Page
`/caches/new`: the hider sets where the cache is, says what it is, adds hints and gets its secret code; `create_cache` saves it all together. Phones show one column with "Where is it?" first (hiders are often standing at the spot) and "Hide this cache" in a full-width bottom bar; desktop puts the form on the left and "Where is it?" on the right (352px, 480px from 1280px), with "Hide this cache" and "Cancel" under the form.
- **Where is it?:** the map picker when Google Maps is set up; otherwise a dashed frame like the empty cache photo. Under it, a Secondary "Use my current location" sets the pin to where they're standing and says how accurate it was, warning past 30 m. Then "Location name (optional)": "The general area finders head for."
- **What is it?:** "Cache name" ("A name for the cache, not a clue to where it is"), "Description (optional)" ("What to look for, not where it is"), and Difficulty: five 48px options, the picked one in the Inverse fill, with bars beside the label and its meaning underneath ("Difficulty 3: Takes some searching").
- **Hints (optional):** up to 3, as plain 48px fields one under another, 12px apart, with nothing beside them and no labels above them ("Hint 1", "Hint 2"… are for screen readers). The placeholders step up: "e.g. Sit on the steps and look down", "A little more specific", "Nearly gives it away". The next hint waits as a dashed "Add another hint" box (with a +) in the spot its field will take, so adding one moves nothing; the next box rises in (200ms). The box goes once there are 3; hints after the first have an × inside the field to remove them.
- **Secret code:** 56px box, Code style, made in the browser (6 characters, never 0, O, 1, I or L), with a 48px refresh icon button inside the box ("Make a new code"). Each press turns the icon half a turn (250ms) and the new code fades in from a slight blur (150ms). Codes are read letter by letter to screen readers.
- **Keyboard:** Enter moves to the next field; only the button saves. Save errors sit by the button.
- **Signed out:** "Log in to hide a cache" ("Hiding a cache needs an account, so it’s saved as yours and you can edit it later.") with the Login Dialog open over it; the form appears once they've logged in. If the login runs out while saving, "Log in again to hide your cache" keeps the form, and its "Log in" opens the dialog and brings the form back.
- **Kept for the tab:** the form as they type, and "Cache hidden!" after saving, so a reload never loses the code or makes it look as if nothing saved.
- **Cache hidden!:** the red MapPin ("still out there to find") at twice its size on still contour rings, "Cache hidden!" in Display, the code in a Subtle card with a copy icon button beside it (it swaps to an ink checkmark for 2 seconds; ink, not green, since green only means "found"), then "Print a slip" (Primary) and "View your cache", a tip to keep the slip dry, a note that the code is on the cache's edit page, and "Hide another cache" as a quiet button (no outline, + icon, Subtle fill on hover) 8px below the tips. The pin grows in from 90% (250ms) and the code card rises 4px (200ms, from 100ms); reduced motion only fades.
- **The slip:** printed alone, black on white inside a dashed cut line, 3.5in wide: the cache's name (Bricolage), "Secret code", the code (JetBrains Mono) and one line: "This is a HuskyCache geocache. Log your find on HuskyCache with this code, then put the cache back where you found it." No link or QR code until the site is deployed.

### Journal Page
`/journal`: the caches you've found and the ones you've hearted. Signed-out visitors stay on the page: under "Your journal", "Your journal keeps the caches you’ve found, your ratings and notes, and your favorites. Log in to see it." with the Login Dialog open over it; the journal appears once they've logged in.
- **Layout:** one column, 16px margins on phones; on desktop the same content in a centred 768px column, 40px below the header. "Your journal" is Display on every screen size (the phone page-title rule; Figma's desktop size is the same).
- **Summary:** one plain row on the page (no box or tint): your points and caches found, each a Title number followed by its words in Small Text Secondary ("4 points", "4 caches found"), then "Each find earns its difficulty in points." (Small, Text Secondary). Points are worked out from your finds (each found cache's difficulty, added up), like the account menu. While the finds load it holds its space, so nothing jumps; it goes once they've loaded with none (or failed to load).
- **Tabs:** "Finds" and "Favorites", 40px, 8px corners, Label text, 8px apart: the chosen one in the Inverse fill with white text, the other white with a Border Strong edge (the map's filter chips, taller). They're real tabs (arrow keys, Home and End move between them; only the chosen tab points at its panel, and the panel can take focus), and the chosen one is kept in the address (`?tab=favorites`), so coming back from a cache opens the same tab.
- **A find:** a white card (Border Subtle, 16px corners), with its photo across the top (yours if the find has one, otherwise the cache's; 2:1 on phones, 3:1 on desktop, fading in over a Subtle band). With no photo there's no photo area, and the card starts with the name. Then, 16px in (20px on desktop): the name (Body Strong), and on one line the place (Small, Text Secondary, first letter capitalized) and the date, "Found Oct 30", in Label Text (the year only shows for an earlier year). Then your journal note, in your voice: Body, set off by a 2px Border Subtle rule on its left, 12px in. Then the difficulty meter and your rating side by side (wrapping on narrow screens). Last, under a thin Border Subtle line, one row of quiet actions: "Add a note" (+) / "Edit note" (pencil) and "Rate it" / "Change rating" (an outline star). Like a cache card, the name is the link to the cache's page, stretched over the card (hover fills it Subtle, pressing shrinks it to 98%; screen readers hear the place, date and difficulty after the name), while the editors and actions stay their own buttons. The list just ends; there's no closing button.
- **Your rating:** a rated find shows "Your rating" and five 20px stars (drawn like the Rating Summary's star: solid ink, empty ones a Border Input outline), each in a 32px square, the same size as when you change them, so nothing grows (smaller than the shared 28px Star Rating on purpose); an unrated one says "Not rated yet" (Small, Text Secondary). "Rate it" / "Change rating" opens the five stars in place, with focus on the star that's chosen now (the first star if none) and a quiet "Cancel" on the same line; the actions row steps aside while it's open. Escape also closes it, and focus goes back to the button. Picking a star saves it straight away; only the rating is sent, so the note is never touched. A key held down from opening it can't pick a star (its repeats are ignored until a fresh press), and a click in the first 300ms after it opens is ignored, so a double-click on "Rate it" can't save 1 star.
- **A journal note:** "Add a note" / "Edit note" opens the same note box as the Log a find page in place of the note: "Journal note" label, a 112px box with "What was it like?", the same 500-character limit and "N characters left" in its last 50 characters (a longer note from before says how far over it is), then a Secondary "Save note" (40px) and a quiet "Cancel"; the actions row steps aside while it's open. Focus moves into the box (at the end of the text) and back to the button on Cancel or Escape. Only the note is sent; an empty note is saved as no note. A held Enter from opening it can't type into the box.
- **Saving (rating or note):** while it saves, it's locked: the stars dim and can't be pressed, the box is read-only, "Save note" and "Cancel" do nothing, and Escape is ignored. "Saving…", then "Rating saved." or "Note saved.", are said to screen readers only (a status line that's always on the page; nothing extra shows), and focus goes back to the button that opened it. If it fails, the stars or box stay open with the "!" error line under the card's details: when nothing was saved (the login ran out), "Log in again to save your rating.", where "Log in again" opens the Login Dialog (then they pick the stars or save the note again); otherwise "Your rating didn't save. Check your connection and try again." (the same for a note).
- **Taken-down caches:** finders can't read a taken-down cache, so its find is called "A taken-down cache" (or by its name, if it can be read), says "Its hider took it down, so its page can't be opened.", isn't a link, can't be rated or re-rated, and leaves out the difficulty when it's unknown (its points can't be counted either, as in the account menu). Your rating stays, and your note stays and can still be edited (it's yours, not the cache's).
- **Favorites:** the caches you've hearted, newest first, as cache cards with the Favorite Button in the corner, the "Found by you" tag on ones you've found, and the Rating Summary. Taken-down favorites are left out. A cache you unfavorite here stays (with an empty heart, so you can tap it again) until you switch tabs.
- **Empty and error states:** no finds: "You haven't found any caches yet. Each one you find shows up here, with the day you found it and your rating." with the Primary "Find a cache" (the page's one red button; full width on phones). No favorites: "You haven't added any favorites yet. Tap the heart on a cache to add it." with a Secondary "Browse the map". Loading says "Loading your finds…" or "Loading your favorites…"; a failed load says "Your finds couldn't load. Check your connection and try again.", with "try again" as a button inside the sentence.
- **Motion, only after a tap:** the stars and the note box fade in and grow from 97% out of their top-left corner (150ms, shared ease-out); an error line fades in (150ms). Closing is instant. Tabs shrink to 97% when pressed and their fill eases (150ms), but switching tabs doesn't animate (arrow keys can do it, and lists don't animate when a filter changes). Entries press to 98% like cache cards, and photos fade in as they arrive. With reduced motion only the fades stay.

### Leaderboard Page
`/leaderboard` ranks everyone who has found a cache by points (the difficulty of every cache they've found, added up; caches taken down later still count). Anyone can see it, logged in or not. The numbers come from the `leaderboard` database function: totals only, no user ids, never which caches anyone found.
- **Layout:** "Leaderboard" in Display, then "Points are the difficulty of every cache you've found, added up." (Small on phones, Body on desktop, Text Secondary), then the list, 16px apart. Phones use the 16px margins; desktop sits on the 10% page margin with the list capped at 768px, left-aligned.
- **Row:** a white row (Border Subtle edge, Border Input with Increase Contrast, 8px corners, 12px by 16px padding), 8px apart in an ordered list: the rank in Body Strong with even-width digits, in a 32px column so 3-digit ranks line up (people with the same points share a rank: 1, 2, 2, 4; when ties straddle the top 50, whoever reached that score first makes the list), on desktop a 40px round Subtle avatar with the username's first two letters in Label (left out on phones, so names get the room; screen readers skip it), the username in Body Strong over "8 finds" (Small, Text Secondary), and the points at the end, "21 pts" in Body Strong, right-aligned (screen readers hear "21 points"). A long username is cut short with "…".
- **Your row:** the selected-card look: the Subtle fill with a 2px Border Strong edge (a 1px border plus a 1px inset ring), a white avatar so it still shows on the fill, "(you)" after your name (never cut off). Its points are plain like everyone else's (no tint). If you're on the board but outside the top 50, your row (with your real rank) sits under the list after a "Your place" label (Label, Text Secondary).
- **Your rank:** when you're on the board, a line above the list says "You're #23 with 9 points." (Body Strong; "1 point" when it's one) with a quiet "Show my row" button (no outline, a down arrow, Subtle fill on hover, 40px) at its end. It moves focus to your row and scrolls it into view instantly, never smoothly; the row then shows the usual focus outline, 2px outside its ink edge. The list just ends after "Your place": no closing button (the header and "Show my row" are enough).
- **Joining:** signed out, a Small line above the list says "Log in to see where you rank.", where "Log in" opens the Login Dialog (a button dressed as the sentence's link) and the line becomes your rank once you've logged in; logged in with no finds yet, "You're not on the board yet. Find a cache to earn your first points.", with "Find a cache" linking to the map.
- **States:** "Loading the leaderboard…" in a white notice; if it can't load (offline, or the database function isn't set up yet), "We couldn't load the leaderboard. Try again", and with no answer within 15 seconds, "The leaderboard took too long to load. Check your signal. Try again", with Try again as an inline button (28px tap area). Pressing it moves focus to the "Leaderboard" heading, since the button goes away while it reloads. A hidden polite status says "Loading the leaderboard…" and then "Leaderboard loaded." to screen readers; an error is read out as an alert. With nobody on the board yet, a white card says "Nobody's on the board yet" (Body Strong) and "Find a cache and log it to earn the first points." (Small) with a Secondary "Go to the map".
- **Motion:** the board loads a moment after the page, so when it arrives (or the error, or the empty card) it fades in once, all together (200ms, shared ease-out), replacing the loading notice. No rise, no row-by-row stagger and nothing on your row: it's a list to read, not a celebration. It's opacity only, so reduced motion leaves it as it is.

## Do's and Don'ts

### Do:
- **Do** keep each meaning color to its one job: Husky Red for to-find and the main action, Found Green for found, Pin Gold for the selected pin, Favorite Pink for favorited hearts, Focus Blue for keyboard focus.
- **Do** show difficulty as bars plus "Difficulty N", and ratings as stars, so the two are never confused.
- **Do** pair every color signal with a shape or words: a check for found, a label for difficulty, an icon and message for errors.
- **Do** keep tap targets at least 28px, and buttons, fields and hint rows at 48px.
- **Do** use the shared focus ring (2px Focus Blue, 2px gap) on everything focusable.
- **Do** follow The Bright Sun Rule (see Colors → Increase Contrast).
- **Do** use the theme tokens and text style classes instead of raw values.
- **Do** keep motion for changes someone caused (a reveal, a press), on the shared ease-out (`cubic-bezier(0.23, 1, 0.32, 1)`, the theme's `ease-out`), and respect reduced motion. Each animation stays under 300ms; a follow-up sequenced after the first change (like the trail drawing after a hint appears) may start up to 100ms later, so a sequence can total about 350ms.

### Don't:
- **Don't** make it look like an official Northeastern site: no crests, seals, official-looking university layouts, or anything implying university approval.
- **Don't** make it look like a corporate dashboard: no dense data panels, gradient cards or enterprise styling.
- **Don't** make it look like a kids' game: no cartoon mascots, confetti bursts or candy colors.
- **Don't** put more than one Husky Red button on a page.
- **Don't** add shadows to cards, buttons or fields; shadows are only for map pins and floating overlays (popups, the map card, menus, the login dialog), plus the Pin shadow on a control floating over a photo (The Flat Field Rule).
- **Don't** use Pin Gold for text, or for anything but the selected pin.
- **Don't** add a fourth typeface, or use JetBrains Mono for anything but secret codes.
- **Don't** put information in the contour backdrop or use it as a fill; it's mood, and it disappears with Increase Contrast.
- **Don't** animate decoration (such as the contour rings), stagger page entrances, smooth-scroll when focus moves, or give a hover effect to something that can't be clicked. Save celebrations for the moment they happen ("Find logged!" and "Cache hidden!"), not for states seen later, like "Found by you".
