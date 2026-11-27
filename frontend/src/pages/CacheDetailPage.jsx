import { useState } from 'react'
import { useParams } from 'react-router'
import MapPin from '../components/MapPin.jsx'
import { FOCUS_RING } from '../components/focusRing.js'
import SiteHeader from '../components/SiteHeader.jsx'
import { useCacheDetail } from '../lib/useCacheDetail.js'
import { contourRing } from './cacheDetail/contours.js'
import CacheMiniMap from './cacheDetail/CacheMiniMap.jsx'
import { cacheCoordinates } from './cacheDetail/coords.js'
import HintTrail from './cacheDetail/HintTrail.jsx'
import {
  BackLink,
  CachePhoto,
  CacheTitle,
  Description,
  DirectionsLink,
  FindAction,
  FindHelp,
  HintsHeader,
  HintsList,
  MetaRow,
  PhoneActionBar,
  TakenDownNotice,
} from './cacheDetail/parts.jsx'

// The page for one cache: /caches/:cacheId
//
// It looks like a spot on a trail map: contour lines circle the cache's map
// pin (or its photo), so the cache sits at the top of the "hill", its name is set
// big like a place label, and the hints are a trail that ends at the cache.
// The data comes from useCacheDetail (src/lib), which never loads secret_code.
//
// contrast-more: classes apply when someone turns on Increase Contrast
// (iPhone: Settings > Accessibility > Display & Text Size): the contour lines
// hide and faint borders darken, so the page stays crisp in bright sun.

// Rings around the pin, 36 units apart, worked out once. The SVG is centred
// on the pin, so (0, 0) is the pin.
const PIN_RINGS = Array.from({ length: 24 }, (_, i) => contourRing(0, 0, 30 + i * 36, 2.2 + i * 0.13))

// The rings sit behind everything (-z-10) and fade out with distance from the
// pin, so the hints and description sit on plain page. The pin's centre is
// 1.625rem in from the photo's bottom-left corner on phones (0.75rem inset +
// half of the 1.75rem pin) and 2.125rem on desktop (1.25rem inset). These are
// in rem, like the pin, so the rings stay centred at any text size.
// centered: the rings sit on the middle of the slot instead (where the mini
// map's pin is, or the middle of a photo, which has no pin).
const CORNER = 'bottom-[1.625rem] left-[1.625rem] translate-y-1/2 lg:bottom-[2.125rem] lg:left-[2.125rem]'
const CENTER = 'left-1/2 top-1/2 -translate-y-1/2'
function PinContours({ centered = false }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="-1000 -1000 2000 2000"
      className={`pointer-events-none absolute -z-10 size-[2000px] -translate-x-1/2 text-border-subtle [mask-image:radial-gradient(closest-side,black_30%,transparent_75%)] contrast-more:hidden ${
        centered ? CENTER : CORNER
      }`}
    >
      {PIN_RINGS.map((d) => (
        <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  )
}

const CARD_BORDER = 'border-border-subtle contrast-more:border-border-input'

function CacheDetails({ cacheId, detail }) {
  const { cache, find } = detail
  const found = Boolean(find)
  // No photo? Show a small real map of the spot instead, when Google Maps is
  // set up (same key as the map page) and the cache can still be hunted. If
  // Maps fails to load, fall back to the empty photo frame.
  const [mapFailed, setMapFailed] = useState(false)
  const showMap =
    !cache.image && cache.is_active && !mapFailed && Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY) && Boolean(cacheCoordinates(cache))
  const action = <FindAction cacheId={cacheId} find={find} isHider={detail.isHider} checking={detail.findChecking} />
  // With no hints (or if they failed to load) there's no trail to end at the
  // cache, so the card shows a plain divider and button instead.
  const hasTrail = !detail.hintCountError && detail.hintCount > 0
  // How-to line under "I found it", only while this person can still log it.
  const help = !found && !detail.isHider && !detail.findChecking ? <FindHelp signedIn={detail.signedIn} /> : null

  return (
    <>
      {/* React 19 moves this into the page's <head>: the tab says which cache it is. */}
      <title>{`${cache.title} · HuskyCache`}</title>
      {/* isolate keeps the rings above the page background but behind the content;
          overflow-clip trims the big rings to this area, so they don't spill over the
          header or make the page scroll sideways. (clip, unlike hidden, keeps the
          desktop card's sticky scrolling working.) */}
      <div className="relative isolate flex w-full flex-1 flex-col overflow-clip">
        <div className="flex w-full flex-1 flex-col gap-4 p-4 lg:gap-6 lg:px-[10%] lg:pb-12 lg:pt-8">
          <BackLink />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-12">
            <div className="flex min-w-0 flex-col gap-4 lg:flex-1 lg:gap-5">
              <div className="relative">
                {/* A photo has no pin of its own (see below), so the rings circle
                    the photo's middle, as they circle the mini map's pin. */}
                <PinContours centered={showMap || Boolean(cache.image)} />
                {showMap ? (
                  <CacheMiniMap cache={cache} found={found} onFail={() => setMapFailed(true)} />
                ) : (
                  <CachePhoto cache={cache} />
                )}
                {/* The corner pin, only on the empty frame. On a photo it could be
                    read as "the cache is hidden here in the picture", so photos get
                    none. The mini map has its own pin at the spot. A taken-down
                    cache isn't something to find, so it gets no red pin. */}
                {cache.is_active && !showMap && !cache.image && (
                  <MapPin found={found} className="absolute bottom-3 left-3 lg:bottom-5 lg:left-5" />
                )}
              </div>
              <CacheTitle cache={cache} className="text-display lg:text-section" />
              {/* Taken down: say so straight away, before anything that could send
                  someone out looking for it. */}
              {!cache.is_active && <TakenDownNotice />}
              <MetaRow cache={cache} className={`border-y py-3 ${CARD_BORDER}`} />
              {cache.is_active && <DirectionsLink cache={cache} />}
              <Description cache={cache} />
            </div>

            {/* The hints and the find action: the page's main task, so a section
                labelled by its heading (not an <aside>, which screen readers call
                "complementary"). Phones: this flows under the description.
                Desktop: a card on the right that stays in view. Taken-down caches
                have nothing to hunt, so it's left out. */}
            {cache.is_active && (
              <section
                aria-labelledby="hints-heading"
                className={`flex flex-col gap-4 lg:sticky lg:top-6 lg:w-[400px] lg:shrink-0 lg:rounded-2xl lg:border lg:bg-bg-surface lg:p-6 ${CARD_BORDER}`}
              >
                  <HintsHeader detail={detail} headingId="hints-heading" />
                  <HintsList
                    detail={detail}
                    renderRows={(rows, onReveal) => (
                      <HintTrail
                        rows={rows}
                        onReveal={onReveal}
                        found={found}
                        action={action}
                        drawTo={detail.lastTappedOrder}
                      />
                    )}
                  />
                  {!hasTrail && (
                    <div className="hidden flex-col gap-4 lg:flex">
                      <div className="h-px w-full bg-border-subtle contrast-more:bg-border-input" />
                      {action}
                    </div>
                  )}
                  {/* The how-to line, under the trail's end on every screen size. On
                      phones it stays in the page, not the sticky bottom bar, so the
                      bar stays small and doesn't cover the screen. */}
                  {help}
              </section>
            )}
          </div>
        </div>
      </div>
      {cache.is_active && (
        <PhoneActionBar
          cacheId={cacheId}
          find={find}
          isHider={detail.isHider}
          checking={detail.findChecking}
          className={`border-t ${CARD_BORDER}`}
        />
      )}
    </>
  )
}

// Loading, errors and "not found".
function Notice({ children, role = 'status' }) {
  return (
    <div role={role} className={`rounded-2xl border bg-bg-surface p-4 text-body text-text-secondary ${CARD_BORDER}`}>
      {children}
    </div>
  )
}

function CacheDetailPage() {
  const { cacheId } = useParams()
  const detail = useCacheDetail(cacheId)

  let content
  if (detail.loading || detail.error || !detail.cache) {
    let notice
    if (detail.loading) {
      notice = <Notice>Loading cache…</Notice>
    } else if (detail.error) {
      notice = (
        <Notice role="alert">
          We couldn’t load this cache.{' '}
          <button
            type="button"
            onClick={detail.retry}
            className={`cursor-pointer rounded-lg font-bold text-text-primary underline ${FOCUS_RING}`}
          >
            Try again
          </button>
        </Notice>
      )
    } else {
      notice = <Notice>We couldn’t find that cache. It may have been removed, or the link is wrong.</Notice>
    }
    content = (
      <div className="flex w-full flex-1 flex-col gap-4 p-4 lg:gap-6 lg:px-[10%] lg:pb-12 lg:pt-8">
        <title>{detail.loading || detail.error ? 'HuskyCache' : 'Cache not found · HuskyCache'}</title>
        {/* Screen readers still get a page heading while there's no cache title. */}
        <h1 className="sr-only">{detail.loading || detail.error ? 'Cache details' : 'Cache not found'}</h1>
        <BackLink />
        {notice}
      </div>
    )
  } else {
    content = <CacheDetails cacheId={cacheId} detail={detail} />
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg-page text-text-primary">
      {/* Hidden until someone presses Tab, so keyboard users can jump past the header. */}
      <a
        href="#main-content"
        className={`sr-only rounded-lg bg-bg-surface px-4 py-2 text-label text-text-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 ${FOCUS_RING}`}
      >
        Skip to content
      </a>
      <SiteHeader />
      {/* The page's own <main> (Layout leaves it out here), with the header outside it.
          tabIndex={-1} lets the skip link move focus here. */}
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        {content}
      </main>
    </div>
  )
}

export default CacheDetailPage
