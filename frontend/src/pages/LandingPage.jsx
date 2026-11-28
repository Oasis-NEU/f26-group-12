import Button from '../components/Button.jsx'
import CacheCard from '../components/CacheCard.jsx'
import { FOCUS_RING } from '../components/focusRing.js'
import SiteHeader from '../components/SiteHeader.jsx'
import { placeName } from '../lib/cacheSearch.js'
import { useLandingCaches } from '../lib/useLandingCaches.js'
import { contourRing } from './cacheDetail/contours.js'

// The landing page, the home page: /
// From the Figma section "Landing · /welcome" (the sketch decides what's
// on the page; the look comes from DESIGN.md).
//
// It's the first thing a newcomer sees, so it has more presence than the
// app's own screens: a big headline, a campus photo, and the two things you
// can do (find a cache, hide one). Then "How it works" in three steps, and
// a few real caches from the database, with a way to see them all on the
// map. The caches come from useLandingCaches (src/lib), which uses the
// map's own query and never selects secret_code.
//
// Phones (the base styles): one column, the photo under the buttons, and
// the steps as a list joined by a dashed trail, like the hint trail on a
// cache's page. Desktop (lg:): the photo beside the headline, the steps as
// three white cards in a row, and the caches in a row of three.
//
// contrast-more: classes apply when someone turns on Increase Contrast
// (iPhone: Settings > Accessibility > Display & Text Size): the contour
// rings hide and faint edges darken, so the page stays crisp in bright sun.

const STEPS = [
  { title: 'Find a cache', text: 'Pick one on the map of campus and use the hints if you need them.' },
  { title: 'Open it', text: 'Enter the secret code from the slip inside to log your find.' },
  { title: 'Earn points', text: 'Harder caches are worth more. Climb the leaderboard.' },
]

// Contour rings around the hero photo, like the rings around a cache's photo
// on its page: the photo reads as a marked spot on a trail map. They start
// near the photo's edge (the inner ones are hidden behind it), are worked
// out once, and the SVG is centred on the photo, so (0, 0) is its middle.
const PHOTO_RINGS = Array.from({ length: 12 }, (_, i) => contourRing(0, 0, 150 + i * 34, 2.2 + i * 0.13))

// Decoration only (DESIGN.md: no information lives in the contour
// backdrop). They sit behind the photo (-z-10) and fade out with distance,
// so the headline sits on plain page. They hide with Increase Contrast.
function PhotoContours() {
  return (
    <svg
      aria-hidden="true"
      viewBox="-1000 -1000 2000 2000"
      className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[2000px] -translate-1/2 text-border-subtle [mask-image:radial-gradient(closest-side,black_25%,transparent_48%)] contrast-more:hidden"
    >
      {PHOTO_RINGS.map((d) => (
        <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  )
}

// The headline, the student-written line about HuskyCache, the two things
// to do and the campus photo. "Find a cache" is the page's one red button;
// "Hide a cache" opens the login dialog by itself for signed-out people.
function Hero() {
  return (
    <section
      aria-labelledby="landing-heading"
      className="grid gap-8 lg:grid-cols-[minmax(0,33fr)_minmax(0,35fr)] lg:items-center lg:gap-16"
    >
      <div className="flex flex-col items-start gap-4 lg:gap-5">
        {/* Display on phones, Section on small laptops (where 64px would
            squeeze into a narrow column), Hero from 1280px. */}
        <h1 id="landing-heading" className="text-balance text-display text-text-primary lg:text-section xl:text-hero">
          Cache in and stay connected to the NU community!
        </h1>
        <p className="max-w-xl text-body text-text-secondary lg:text-body-large">
          HuskyCache is a student led website that allows new Boston admits to explore the campus, find secret hidden
          treasures along the way, and leave their mark for other students to find.
        </p>
        {/* Full width and stacked on phones; side by side on desktop. */}
        <div className="flex w-full flex-col gap-3 pt-2 lg:w-auto lg:flex-row lg:pt-3">
          <Button to="/map" fullWidth className="lg:w-auto">
            Find a cache
          </Button>
          <Button to="/caches/new" variant="secondary" fullWidth className="lg:w-auto">
            Hide a cache
          </Button>
        </div>
      </div>

      {/* Snell Library, not Krentzman Quad: Krentzman's photo shows the
          university's seal, and HuskyCache must never look like an official
          Northeastern site. The photo is the page's largest element, so the
          browser fetches it first (fetchPriority) and width/height reserve its
          space before it arrives. It's 900 x 594 and about 125 KB already. */}
      <figure className="relative flex flex-col gap-2">
        <PhotoContours />
        <img
          src="/assets/snell-library.jpeg"
          alt="Students with backpacks walking across the brick plaza to the entrance of Snell Library"
          width={900}
          height={594}
          fetchPriority="high"
          decoding="async"
          className="aspect-[3/2] w-full rounded-2xl bg-bg-subtle object-cover lg:aspect-[7/5]"
        />
        {/* Names the place, as a field guide would: newcomers may not know it yet. */}
        <figcaption className="text-small text-text-secondary">Snell Library</figcaption>
      </figure>
    </section>
  )
}

// The three steps. They really are a sequence, so they're a numbered list
// (the visible numbers are hidden from screen readers, which already say
// "1 of 3"). Phones: a list, the markers joined by a dashed line (dashed
// means "not walked yet", as on the hint trail). Desktop: white cards.
function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works-heading" className="flex flex-col gap-5 lg:gap-6">
      <h2 id="how-it-works-heading" className="text-title text-text-primary lg:text-section">
        How it works
      </h2>
      <ol className="flex flex-col gap-5 lg:grid lg:grid-cols-3 lg:gap-6">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="relative flex gap-3 lg:flex-col lg:gap-4 lg:rounded-2xl lg:border lg:border-border-subtle lg:bg-bg-surface lg:p-6 lg:contrast-more:border-border-input"
          >
            {/* The trail between markers: from under this marker down to the
                next one (the list's 20px gap, less 8px), phones only. */}
            {index < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute -bottom-3 left-4 top-10 -ml-px border-l border-dashed border-border-input contrast-more:border-text-secondary lg:hidden"
              />
            )}
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-inverse text-label text-text-on-accent"
            >
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="text-body-strong text-text-primary lg:text-heading">{step.title}</h3>
              <p className="text-small text-text-secondary lg:text-body">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

// A few real caches, as the shared photo-on-top cards, and a way to the map.
// While they load, the space is held (they're at the end of the page, so
// nothing below jumps). If they can't load, or there are none yet, the
// section is left out: the hero's "Find a cache" already leads to the map.
function FeaturedCaches() {
  const { status, caches, ratings } = useLandingCaches()

  if (status === 'loading') return <div aria-hidden="true" className="min-h-96 lg:min-h-80" />
  if (status === 'error' || caches.length === 0) return null

  // A cache missing from the ratings has none yet; no ratings at all (null)
  // means they couldn't load, and the cards leave the rating out (as on the map).
  const ratingFor = (id) => (ratings ? (ratings[id] ?? { average: null, count: 0 }) : undefined)

  return (
    <section aria-labelledby="featured-heading" className="flex flex-col gap-5 lg:gap-6">
      <div className="flex flex-col gap-1">
        <h2 id="featured-heading" className="text-title text-text-primary lg:text-section">
          Waiting to be found
        </h2>
        <p className="text-body text-text-secondary">Caches other students have hidden around campus.</p>
      </div>
      <ul className="grid gap-3 lg:grid-cols-3 lg:gap-6">
        {caches.map((cache) => (
          // Each card is as tall as its own content (a card without a photo
          // doesn't stretch to match one with a photo and leave a white gap).
          <li key={cache.id}>
            <CacheCard
              to={`/caches/${cache.id}`}
              title={cache.title}
              location={placeName(cache.location_name)}
              difficulty={cache.difficulty}
              image={cache.image}
              rating={ratingFor(cache.id)}
              roomy
            />
          </li>
        ))}
      </ul>
      {/* On its own line, so a button, not a link (The Links Go Places
          Rule). Secondary: the hero's "Find a cache" is the red one. */}
      <Button to="/map" variant="secondary" fullWidth className="lg:w-auto lg:self-start">
        See them all on the map
      </Button>
    </section>
  )
}

function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg-page text-text-primary">
      <title>HuskyCache</title>

      {/* Hidden until someone presses Tab, so keyboard users can jump past the header. */}
      <a
        href="#main-content"
        className={`sr-only rounded-lg bg-bg-surface px-4 py-2 text-label text-text-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 ${FOCUS_RING}`}
      >
        Skip to content
      </a>
      <SiteHeader />
      {/* The page's own <main> (Layout leaves it out here), with the header outside it.
          tabIndex={-1} lets the skip link move focus here. isolate keeps the
          contour rings above the page background but behind the content;
          overflow-clip trims them, so the page never scrolls sideways. */}
      <main id="main-content" tabIndex={-1} className="relative isolate flex flex-1 flex-col overflow-clip outline-none">
        <div className="flex w-full flex-col gap-12 px-4 pb-12 pt-8 lg:gap-18 lg:px-[10%] lg:pb-24 lg:pt-18">
          <Hero />
          <HowItWorks />
          <FeaturedCaches />
        </div>
      </main>
    </div>
  )
}

export default LandingPage
