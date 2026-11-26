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
  highlight-soft: "#fdf3dc"
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
  brand-mark:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    lineHeight: 1
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
    padding: "16px"
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
    typography: "{typography.body}"
    padding: "0 10%"
    height: "64px"
  nav-bar-phone:
    backgroundColor: "{colors.bg-surface}"
    padding: "0 16px"
    height: "56px"
---

# Design System: HuskyCache

## Overview

**Creative North Star: "The Campus Field Guide"**

HuskyCache looks like a pocket field guide a student takes outside: calm, paper-toned pages, bold headings that name the place, and a few strong marks that say what to do next. Husky Red marks what's still out there to find, Found Green ticks off what you've found, and Star Gold records how good it was. Everything else stays in the background so those marks read at a glance, on a phone, outdoors, in daylight.

Components are friendly and sturdy. Corners are softly rounded, borders are thin, and fills are plain. Targets are big enough to hit while walking (48px buttons, fields and hint rows; 28px stars). Type does the expressive work: Bricolage Grotesque gives headings a little character, and Atkinson Hyperlegible Next keeps everything people read and tap as legible as possible.

The look is confident but never official. HuskyCache is an unofficial student project, so it nods to campus life without borrowing a university's crests, seals or institutional layouts. It also stays away from two other directions: the dense, gradient-card look of a corporate dashboard, and the mascots, confetti and candy colors of a kids' game.

**Key Characteristics:**
- Sage-tinted neutrals: an off-white page, white surfaces, gray-green borders, near-black ink.
- Four meaning colors, each with one job: red (to find, the main action), green (found), gold (ratings and selection), blue (keyboard focus).
- Gently rounded controls (8px) and cards (16px); fully round only for pins, avatars and pill tags.
- Flat surfaces; map pins are the only things that cast a shadow.
- Bricolage Grotesque headings, Atkinson Hyperlegible Next for everything else, JetBrains Mono only for secret codes.
- Mobile-first, built for one-handed, outdoor use; desktop is the same system with more room.

## Colors

A quiet sage-gray field with four saturated marks, each reserved for one meaning.

### Primary
- **Husky Red** (`accent`): the one main action on a page (the Primary button), unfound caches on the map, and the brand mark. Its darker step, **Husky Red Pressed** (`accent-pressed`), is the Primary button's hover. **Husky Red Soft** (`accent-soft`) is for light red backgrounds.

### Secondary
- **Found Green** (`found`): anything you've found. Found pins, the checkmark and the "Found by you" text. **Found Green Soft** (`found-soft`) is the pill behind "Found by you".

### Tertiary
- **Star Gold** (`highlight`): star ratings and the ring around the selected map pin. **Star Gold Soft** (`highlight-soft`) is the background for points earned. Gold is a fill, never text; on white it's too light to read.

### Neutral
- **Page** (`bg-page`): the background behind everything, a barely green off-white.
- **Surface** (`bg-surface`): white cards, fields, panels and the nav bar, sitting on the page.
- **Subtle** (`bg-subtle`): locked hints, chips and hover fills.
- **Inverse** (`bg-inverse`): the rare dark fill, such as a selected chip.
- **Text** (`text-primary`): main text and filled difficulty bars; near-black with a hint of green.
- **Text Secondary** (`text-secondary`): supporting text, placeholders, metadata and disabled labels.
- **Text on Accent** (`text-on-accent`): white text on red or dark fills.
- **Border Subtle** (`border-subtle`): card outlines, dividers, empty difficulty bars and the locked hint's hover fill.
- **Border Input** (`border-input`): text field borders, dark enough for 3:1 contrast.
- **Border Strong** (`border-strong`): Secondary buttons and the selected card.

### Utility
- **Error** (`error`): error text, the error icon and error borders. It shares Husky Red Pressed's value, but it's a separate token so errors can change without changing the brand.
- **Focus Blue** (`focus`): the keyboard focus ring, and nothing else.

### Named Rules
**The One Meaning Rule.** Red, green, gold and blue each mean exactly one thing. Never use them for decoration, for headings, or to make something "pop".

**The One Red Button Rule.** A page has at most one Husky Red button. Every other action is Secondary.

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

Spacing follows Tailwind's 4px scale, and Figma's spacing variables are the same steps (4, 8, 12, 16, 20, 24, 32, 48, 64). Phone layouts use a 16px side margin; the desktop nav bar uses 10% side margins (144px at 1440px). Content columns stay narrow enough to read: list pages max out around 800px and long body text around 640px. Content is left-aligned.

## Elevation & Depth

The system is flat. Depth comes from tonal layering: white surfaces on the off-white page, separated by thin gray-green borders. The one shadow token belongs to map pins, so they stand out from the map underneath.

### Shadow Vocabulary
- **Pin** (`box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.2)`): map pins only.

### Named Rules
**The Flat Field Rule.** Cards, buttons and fields never cast shadows. If something needs to stand out, give it a border or a fill.

## Shapes

Corners are gently rounded: 8px (`rounded-lg`) for buttons, fields, hint rows and the phone menu button; 16px (`rounded-2xl`) for cards. Fully round (`rounded-full`) is only for map pins, avatars, pill tags and the small error dot. The red brand mark stays square.

Borders are 1px. Where Figma draws a 2px border (the selected card, the error field), the code uses a 1px border plus a 1px inset ring, so the element looks the same but doesn't grow by a pixel when its state changes.

## Components

### Buttons
Big, friendly and plain.
- **Shape:** gently rounded (8px), 48px tall, 20px side padding; width hugs the label, or fills on phones (`fullWidth`).
- **Primary:** Husky Red with white Label text. Hover is Husky Red Pressed. One per page.
- **Secondary:** white with a 1px Border Strong outline and dark text. Hover fills with Subtle.
- **Disabled:** Primary turns Subtle with Text Secondary; Secondary keeps white with a Border Subtle outline and Text Secondary.
- **Focus:** the shared focus ring (2px Focus Blue, 2px white gap). Hidden for mouse clicks.
- **Element:** a real `<button>`, a router link (`to`) or an `<a>` (`href`).

### Chips
- **Found tag:** a Found Green Soft pill with a small green check and "Found by you" in green Tag text (3px vertical padding, 8px left, 12px right).

### Cards / Containers
- **Cache card:** white, 1px Border Subtle outline, 16px corners, 16px padding, no shadow. It shows the title in Body Strong, an optional found tag, and a row with the location (Small, Text Secondary) and the difficulty meter.
- **Hover:** fills with Subtle (only when the card is a link or button).
- **Selected:** the outline becomes Border Strong, drawn 2px thick. It matches the pin someone clicked on the map.

### Inputs / Fields
- **Style:** label (Label) above a 48px white box with a 1px Border Input outline, 8px corners, 16px padding and 16px Body text. Placeholder is Text Secondary. Help text (Small) sits below.
- **Focus:** the shared focus ring.
- **Error:** the outline turns Error and is drawn 2px thick; the help text becomes the error message in Error, with a small round "!" icon. Errors appear under the field, never on a new screen.

### Navigation
- **Nav bar:** a white bar with a 1px Border Subtle bottom line, 64px tall on desktop and 56px on phones. On the left are the red square "N" mark and the HuskyCache wordmark.
- **Desktop:** links in Body, Text Secondary, 32px apart; hover darkens to Text. The current page's link is Text and underlined. "Log in" is a Secondary button.
- **Phone:** a 40px menu button (8px corners, Border Subtle outline, three 18px lines) that opens the same links. The open menu and the logged-in avatar menu aren't designed in the system yet.

### Difficulty Meter
Five 7 × 14px bars, 3px apart: filled bars in Text, empty ones in Border Subtle, followed by "Difficulty N" in Label. The label can be hidden visually but always stays for screen readers.

### Star Rating
Five 28px gold stars with 8px gaps, using Figma's exported star images (filled stars are Star Gold with a dark outline; empty ones are gray outlines). When picking a rating, each star is a button, and hovering with a mouse previews that rating.

### Hint Row
- **Locked:** a 48px Subtle row with "Hint N" in Body Strong and "Tap to reveal" in Small. Hover darkens it to Border Subtle. When an earlier hint is still locked, it says "Reveal hint N first" and can't be pressed.
- **Revealed:** a white box with a 1px Border Subtle outline: "Hint N" in Small, then the hint in Body.

### Map Pin
- **Unfound:** a 28px Husky Red circle with a 2px white border and the pin shadow.
- **Found:** a 28px Found Green circle with a white check (Figma's exported image).
- **Selected:** grows to 40px with a 4px Star Gold ring.
- **Hover:** grows to 110%, animated only when reduced motion is off.

## Do's and Don'ts

### Do:
- **Do** keep each meaning color to its one job: Husky Red for to-find and the main action, Found Green for found, Star Gold for ratings and the selected pin, Focus Blue for keyboard focus.
- **Do** show difficulty as bars plus "Difficulty N", and ratings as gold stars, so the two are never confused.
- **Do** pair every color signal with a shape or words: a check for found, a label for difficulty, an icon and message for errors.
- **Do** keep tap targets at least 28px, and buttons, fields and hint rows at 48px.
- **Do** use the shared focus ring (2px Focus Blue, 2px gap) on everything focusable.
- **Do** use the theme tokens and text style classes instead of raw values.

### Don't:
- **Don't** make it look like an official Northeastern site: no crests, seals, official-looking university layouts, or anything implying university approval.
- **Don't** make it look like a corporate dashboard: no dense data panels, gradient cards or enterprise styling.
- **Don't** make it look like a kids' game: no cartoon mascots, confetti bursts or candy colors.
- **Don't** put more than one Husky Red button on a page.
- **Don't** add shadows to cards, buttons or fields; only map pins have one.
- **Don't** use Star Gold for text.
- **Don't** add a fourth typeface, or use JetBrains Mono for anything but secret codes.
