import { useEffect, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'
import Button from '../components/Button.jsx'
import { FOCUS_RING } from '../components/focusRing.js'
import { LogoMark } from '../components/Logo.jsx'
import MapPin from '../components/MapPin.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { contourRing } from './cacheDetail/contours.js'

// The landing page, the home page: /
// From the Figma section "Landing · /welcome" (the sketch decides what's
// on the page; the look comes from DESIGN.md).
//
// It's the first thing a newcomer sees, so it has more presence than the
// app's own screens: a short line saying what HuskyCache is, a big headline,
// a campus photo, and the two things you can do (find a cache, hide one).
// Then "How it works" in three steps, and a small footer. It loads no data:
// everything on it is written here, so it never waits on Supabase.
//
// Phones (the base styles): one column, the photo under the buttons, and
// the steps as a list joined by a dashed trail that ends at a red pin, like
// the hint trail on a cache's page. Tablets (md:, 768px): still one column,
// but the text and photo stop growing at a readable width and the buttons
// sit side by side. Desktop (lg:, 1024px): the photo beside the headline,
// and the steps across the page as the same trail, sideways.
//
// contrast-more: classes apply when someone turns on Increase Contrast
// (iPhone: Settings > Accessibility > Display & Text Size): the contour
// rings hide and faint edges darken, so the page stays crisp in bright sun.

// Motion (DESIGN.md), on the shared ease-out, under 300ms. starting: is
// the style each one animates from (CSS @starting-style), which runs when
// the element is put on the page.
//   ENTRANCE  the page's one orchestrated moment: the first time someone
//             opens the landing page in a tab, the hero's words and photo
//             fade in and rise 8px together (300ms). No stagger (DESIGN.md:
//             don't stagger page entrances) and nothing loops. The contour
//             rings and the steps' trail stay still (decoration never
//             animates). With reduced motion only the fade stays.
// Button presses come from Button.
const ENTRANCE =
  'transition-[opacity,translate] duration-300 ease-out starting:translate-y-2 starting:opacity-0 motion-reduce:starting:translate-y-0'

// Whether the hero has already played its entrance in this tab. Coming back
// to the home page (the logo goes here) just shows it: an entrance seen
// again and again starts to feel slow.
let heroHasPlayed = false

function useFirstVisitEntrance() {
  // Worked out once, when the page first appears, so it doesn't change
  // halfway through the animation.
  const [playEntrance] = useState(() => !heroHasPlayed)
  useEffect(() => {
    heroHasPlayed = true
  }, [])
  return playEntrance ? ENTRANCE : ''
}

const STEPS = [
  { title: 'Find a cache', text: 'Pick one on the map of campus and use the hints if you need them.' },
  { title: 'Open it', text: 'Enter the secret code from the slip inside to log your find.' },
  { title: 'Earn points', text: 'Harder caches are worth more. Climb the leaderboard.' },
]

// The footer's two groups of pages. Only pages that exist today; About and
// Contact will join when they're built.
const FOOTER_GROUPS = [
  {
    id: 'footer-caches',
    label: 'Caches',
    links: [
      { label: 'Map', to: '/map' },
      { label: 'Hide a cache', to: '/caches/new' },
    ],
  },
  {
    id: 'footer-progress',
    label: 'Progress',
    links: [
      { label: 'Journal', to: '/journal' },
      { label: 'Leaderboard', to: '/leaderboard' },
    ],
  },
]

const GITHUB_URL = 'https://github.com/Oasis-NEU/f26-group-12'

// A footer link: quiet Small text that darkens on hover (150ms), with the
// shared focus ring. min-h-7 makes the tap area at least 28px tall.
const FOOTER_LINK = `inline-flex min-h-7 items-center gap-1 rounded-sm text-small text-text-secondary underline-offset-4 hover:text-text-primary hover:underline motion-safe:transition-colors motion-safe:duration-150 motion-safe:ease-out ${FOCUS_RING}`

// Contour rings around the hero photo, like the rings around a cache's photo
// on its page: the photo reads as a marked spot on a trail map. They start
// near the photo's edge (the inner ones are hidden behind it), are worked
// out once, and the SVG is centred on the photo, so (0, 0) is its middle.
const PHOTO_RINGS = Array.from({ length: 12 }, (_, i) => contourRing(0, 0, 150 + i * 34, 2.2 + i * 0.13))

// Decoration only (DESIGN.md: no information lives in the contour
// backdrop). They sit behind the photo (-z-10) and hide with Increase
// Contrast.
//
// They show only in a thin oval around the photo, so the headline, the
// buttons and the steps all sit on plain page. The wrapper reaches a little
// past the photo (on phones, 28px above and below it, which stops short of
// the buttons 32px above; on desktop, 56px to the sides, inside the 64px gap
// before the text), and its mask is an oval that touches the wrapper's edges
// ("ellipse closest-side"): rings are fully drawn near the photo and fade to
// nothing at the wrapper's edge. Because the wrapper is sized from the photo,
// the oval fits the photo at every screen width.
function PhotoContours() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -inset-x-4 -inset-y-7 -z-10 [mask-image:radial-gradient(ellipse_closest-side,black_70%,transparent_100%)] contrast-more:hidden lg:-inset-x-14 lg:-inset-y-16"
    >
      <svg
        viewBox="-1000 -1000 2000 2000"
        className="absolute left-1/2 top-1/2 size-[2000px] max-w-none -translate-1/2 text-border-subtle"
      >
        {PHOTO_RINGS.map((d) => (
          <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    </div>
  )
}

// What HuskyCache is, the headline, the student-written line about it, the
// two things to do and the campus photo. "Find a cache" is the page's one red
// button; "Hide a cache" opens the login dialog by itself for signed-out
// people.
function Hero() {
  const entrance = useFirstVisitEntrance()
  return (
    <section
      aria-labelledby="landing-heading"
      className="grid gap-8 lg:grid-cols-[minmax(0,33fr)_minmax(0,35fr)] lg:items-center lg:gap-16"
    >
      {/* max-w-2xl: on tablets the column stops at a readable width
          instead of stretching across the screen. */}
      <div className={`flex max-w-2xl flex-col items-start gap-4 lg:max-w-none lg:gap-5 ${entrance}`}>
        {/* The kicker says plainly what this is before the playful headline.
            It's a plain line, not a heading, read just before the headline. */}
        <div className="flex flex-col gap-2">
          <p className="text-label text-text-secondary">Campus geocaching, made by students</p>
          {/* Display on phones, Section on tablets (the column is wide) and
              small laptops (where 64px would squeeze into a narrow column),
              Hero from 1280px. text-balance evens out the lines, and the
              no-break space keeps "NU community!" together, so the last line
              is never one lonely word. */}
          <h1
            id="landing-heading"
            className="text-balance text-display text-text-primary md:text-section xl:text-hero"
          >
            Cache in and stay connected to the NU&nbsp;community!
          </h1>
        </div>
        <p className="max-w-xl text-body text-text-secondary lg:text-body-large">
          HuskyCache is a student-led website that allows new Boston admits to explore the campus, find secret hidden
          treasures along the way, and leave their mark for other students to find.
        </p>
        {/* Full width and stacked on phones; side by side, hugging their
            labels, from tablets up. */}
        <div className="flex w-full flex-col gap-3 pt-2 md:w-auto md:flex-row lg:pt-3">
          <Button to="/map" fullWidth className="md:w-auto">
            Find a cache
          </Button>
          <Button to="/caches/new" variant="secondary" fullWidth className="md:w-auto">
            Hide a cache
          </Button>
        </div>
      </div>

      {/* Snell Library, not Krentzman Quad: Krentzman's photo shows the
          university's seal, and HuskyCache must never look like an official
          Northeastern site. The photo is the page's largest element, so the
          browser fetches it first (fetchPriority) and width/height reserve its
          space before it arrives. It's 900 x 594 and about 125 KB already. */}
      {/* The photo and its caption take the entrance, not the figure, so the
          contour rings behind them stay still. */}
      <figure className="relative flex max-w-2xl flex-col gap-2 lg:max-w-none">
        <PhotoContours />
        <img
          src="/assets/snell-library.jpeg"
          alt="Students with backpacks walking across the brick plaza to the entrance of Snell Library"
          width={900}
          height={594}
          fetchPriority="high"
          decoding="async"
          className={`aspect-[3/2] w-full rounded-2xl bg-bg-subtle object-cover lg:aspect-[7/5] ${entrance}`}
        />
        {/* Names the place, as a field guide would: newcomers may not know it yet. */}
        <figcaption className={`text-small text-text-secondary ${entrance}`}>Snell Library</figcaption>
      </figure>
    </section>
  )
}

// The three steps, drawn as a trail like the hint trail on a cache's page:
// 32px ink numbers joined by a dashed line (dashed means "not walked yet"),
// ending at a small red pin, the cache. Down the page on phones and tablets,
// across it on desktop. The trail and pin are decoration and never move.
//
// They really are a sequence, so they're a numbered list. The visible
// numbers are hidden from screen readers; instead each step's name starts
// with "Step 1:" (for screen readers only), so the order is always heard.
function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works-heading" className="flex flex-col gap-5 lg:gap-8">
      {/* Title on phones and tablets, Display on desktop: always well under
          the headline, which stays the page's one big voice. */}
      <h2 id="how-it-works-heading" className="text-title text-text-primary lg:text-display">
        How it works
      </h2>
      {/* role="list" looks redundant on an <ol>, but Safari (WebKit) stops
          treating a list as a list once its bullets are turned off (Tailwind
          does that for every list), so screen readers would lose "list, 3
          items". Saying it again keeps it. */}
      <ol role="list" className="flex max-w-2xl flex-col gap-5 lg:grid lg:max-w-none lg:grid-cols-3 lg:gap-8">
        {STEPS.map((step, index) => {
          const isLast = index === STEPS.length - 1
          return (
            <li
              key={step.title}
              className={`relative flex gap-3 lg:flex-col lg:gap-4 lg:pb-0 ${isLast ? 'pb-12' : ''}`}
            >
              {/* Phones and tablets: the trail runs down from under this number
                  to the next one (the list's 20px gap, less 8px), or, after the
                  last step, down to the pin (8px above it). */}
              <span
                aria-hidden="true"
                className={`absolute left-4 top-10 -ml-px border-l border-dashed border-border-input contrast-more:border-text-secondary lg:hidden ${
                  isLast ? 'bottom-9' : '-bottom-3'
                }`}
              />
              {/* Desktop: the trail runs across from beside this number to the
                  next one (the 32px column gap, less 8px), or, after the last
                  step, to the pin at the row's end (8px short of it). */}
              <span
                aria-hidden="true"
                className={`absolute left-10 top-4 hidden border-t border-dashed border-border-input contrast-more:border-text-secondary lg:block ${
                  isLast ? 'right-9' : '-right-6'
                }`}
              />
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-inverse text-label text-text-on-accent"
              >
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-col gap-1 lg:pr-4">
                <h3 className="text-body-strong text-text-primary lg:text-heading">
                  <span className="sr-only">{`Step ${index + 1}: `}</span>
                  {step.title}
                </h3>
                <p className="text-small text-text-secondary md:text-body">{step.text}</p>
              </div>
              {/* The trail's end: the cache, a still red pin (decorative pins
                  don't react to hover). Under the last step on phones, at the
                  row's right end on desktop, level with the numbers. */}
              {isLast && <MapPin className="absolute bottom-0 left-0.5 lg:bottom-auto lg:left-auto lg:right-0 lg:top-0.5" />}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

// A quiet footer, for this page only: the logo, what HuskyCache is (and
// isn't), and links to the app's pages and its code. It's navigation (a
// <nav> inside the <footer> landmark), like the header's page pills, so
// these standalone lines are links (The Links Go Places Rule).
function LandingFooter() {
  return (
    <footer className="border-t border-border-subtle contrast-more:border-border-input">
      <div className="flex flex-col gap-8 px-4 pb-12 pt-10 md:flex-row md:justify-between md:gap-12 md:px-8 lg:gap-16 lg:px-[10%] lg:pb-16 lg:pt-12">
        <div className="flex max-w-sm flex-col items-start gap-3">
          {/* The mark is decorative; the name beside it is read out. Not a
              link: this page is already home. */}
          <p className="flex items-center gap-2 text-heading font-extrabold text-text-primary">
            <LogoMark className="size-7" />
            HuskyCache
          </p>
          <p className="text-small text-text-secondary">
            An unofficial student project, built through the Oasis Project Series. Not affiliated with Northeastern.
          </p>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={FOOTER_LINK}>
            GitHub
            <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={2} />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
        <nav aria-label="Footer" className="flex gap-12 lg:gap-16">
          {FOOTER_GROUPS.map((group) => (
            <div key={group.id} className="flex flex-col gap-2">
              <p id={group.id} className="text-label text-text-primary">
                {group.label}
              </p>
              {/* role="list": the same Safari fix as the steps' list above. */}
              <ul role="list" aria-labelledby={group.id} className="flex flex-col gap-1">
                {group.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className={FOOTER_LINK}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </footer>
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
        <div className="flex w-full flex-col gap-12 px-4 pb-16 pt-8 md:gap-16 md:px-8 md:pt-12 lg:gap-18 lg:px-[10%] lg:pb-24 lg:pt-18">
          <Hero />
          <HowItWorks />
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}

export default LandingPage
