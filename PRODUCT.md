# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Northeastern students, especially people new to campus or to Boston. Each person plays two roles:

- **Finder:** searches for caches using the map and up to three hints, opens the cache, enters its secret code to log the find, and rates it.
- **Hider:** hides a small item somewhere real, adds it to the map with a difficulty and hints, and prints a slip with the cache's secret code to put inside.

Use is split evenly between phone and laptop. People plan, browse, and hide caches on a laptop, and hunt for them on a phone while walking around campus outdoors.

## Product Purpose

HuskyCache is a geocaching web app for Northeastern students. It starts on campus and grows to cover Boston. Its purpose is to get students out exploring the places around them. Success means students, especially newcomers, discover campus and the city by finding and hiding caches.

## Positioning

HuskyCache is campus-first geocaching made by students, for students. Other students hide the caches in places that matter to Northeastern life, and each find is proven by a secret code inside the cache, not just claimed. Exploring is the point. Points and the leaderboard add motivation but are not the core.

## Operating Context

- **The landing page is the home page (`/`).** It introduces HuskyCache to newcomers; hunting starts on the map at `/map`. The old `/welcome` address redirects to `/`.
- **The physical loop:** the hider puts the item and a printed slip with the code in a real spot. The finder opens it, types the code, and leaves the item in place for the next person. A cache isn't used up when found; finds are tracked per person.
- **Hints unlock in order**, up to three per cache.
- **Outdoor phone use.** Hunting happens on a phone outdoors, on the move, often in daylight, so legibility at a glance matters.
- **Built through the Oasis Project Series** by a team mostly new to web development, with milestones toward a Demo Day presentation.

## Capabilities and Constraints

- **Built:** adding a cache with difficulty 1–5, a map of caches, finding and logging a cache with a secret code, hints, a journal of finds with difficulty and star rating, rating caches, email log-in and sign-up, an account menu with log-out, success screens, a printable code slip, and a page-not-found screen.
- **Next:** score and leaderboard (points come from cache difficulty), map filters (All / To find / My finds, only when logged in), Google log-in with "Choose a username", forgot password, a My caches page, editing and taking down caches, and a landing page.
- **Nice-to-have:** AI-generated hints from images, routes through several caches, a location check as a second layer when logging, a warning for caches within about 10 m of each other, messaging (on hold), and a QR code on the slip.
- **Secret codes:** 6 characters, uppercase, never 0, O, 1, I or L. They're generated automatically; the hider can swap the code before saving, and it's locked after. Codes are shown only to the hider, never to finders.
- **Wrong codes and other errors show inline**, under the field, never on a new screen.
- **Difficulty is always bars plus "Difficulty N"; ratings are always stars**, so the two never get confused.
- **Caches are never deleted.** Taking one down hides it (`is_active = false`).
- **No stored locations.** Any location check runs in the browser and saves nothing.
- **Test data only** (fake accounts, test caches) until security is finished.
- **Terminology:** cache, hide a cache, find, log a find, hint, secret code, slip, journal, difficulty, rating, points, leaderboard.
- **Open:** whether sign-up will be limited to Northeastern email addresses.

## Brand Commitments

- **Name:** HuskyCache.
- **Unofficial student project.** It's built by students through the Oasis Project Series and not endorsed by Northeastern. It can nod to campus life and Husky culture, but must not look like an official Northeastern site or imply university approval.
- **Open decision:** the current red square with an "N" reads close to Northeastern's own mark. Revisit it in light of the point above.
- **Voice in existing copy:** plain and friendly, student to student, e.g. "Cache in and stay connected to the NU community!" and "HuskyCache is a student led website that allows new Boston admits to explore the campus, find secret hidden treasures along the way, and leave their mark for other students to find."
- **Design source:** the Figma file "Husky Design" (Foundations, Components and Sketches pages) is the team's design authority.

## Evidence on Hand

- **Campus photos:** `frontend/public/assets/krentzman-quad.jpeg`, `snell-library.jpeg`, `west-village-residence.jpeg`.
- **Journal image:** `frontend/public/assets/cache-journal.png`.
- **Real places named in designs:** Krentzman Quad, Snell Library, West Village, Back Bay Fens.
- **Absent, do not fabricate:** real users, usage numbers, testimonials, press, or any statement of Northeastern endorsement. All accounts and caches are test data.

## Product Principles

1. **Get people outside.** Every screen should move someone toward going and finding (or hiding) a real thing in a real place.
2. **Proof over claims.** A find counts because the secret code was entered. Keep that loop simple and trustworthy.
3. **Made for newcomers.** Assume the person doesn't know campus or Boston yet. Name places and give directions they can act on.
4. **Collect less.** Don't store locations, show secret codes only to their hider, and ask for nothing the game doesn't need.
5. **Plain, readable, quick.** The team is learning and the users are on the move, so prefer the clear and familiar over the clever.

## Accessibility & Inclusion

- Readable outdoors on a phone: strong contrast and text sized for a quick glance.
- Tap targets big enough to use while walking (the Figma file uses 28px stars and 48px buttons and fields).
- Input text is at least 16px so phones don't zoom in.
- Meaning never rests on color alone: difficulty has a text label, and found caches show a checkmark.
- No formal standard (such as WCAG AA) has been confirmed yet.
