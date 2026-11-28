import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import Button from '../components/Button.jsx'
import CacheSlip from '../components/CacheSlip.jsx'
import FieldMessage from '../components/cacheForm/FieldMessage.jsx'
import { RISE_IN } from '../components/cacheForm/formStyles.js'
import { FOCUS_RING } from '../components/focusRing.js'
import LoginRequired from '../components/login/LoginRequired.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import StatusTag from '../components/StatusTag.jsx'
import { useMyCaches } from '../lib/useMyCaches.js'
import { describeCacheStats } from './myCachesData.js'

// My caches: /my-caches. From the Figma section "My caches · /my-caches".
//
// The caches you've hidden, active ones first, as plain white rows for
// managing them (no photos: it's a list to work through, not to browse).
// Each row has the cache's name with whether it's Active or Taken down
// right after it, a line with its place, then its actions: "Edit", and
// "Print slip" for an active cache, which prints the same slip as "Cache
// hidden!" (CacheSlip). The secret code is loaded only when "Print slip" is
// pressed, from cache_secrets (only the hider can read it); the list itself
// never selects it. "Hide a new cache" sits at the top.
//
// Finds and ratings aren't shown yet: the database only lets people read
// their own finds, so they always came back empty (see myCachesData.js).
//
// After "Save changes" on Edit cache, people land back here with a line
// saying it saved; after taking a cache down or putting it back there and
// pressing "Back to My caches", a line saying that. Signed-out visitors get the login dialog over the page,
// and the list appears once they've logged in. The data comes from
// useMyCaches (src/lib).
//
// Phones (the base styles): each row stacks, with its buttons sharing a
// full-width line underneath in two equal halves. "Hide a new cache" drops
// under the heading when the line is too narrow for both. Desktop (lg:): a
// centred 768px column, and each row lays out across: name and details on
// the left, buttons on the right.

const CARD = 'rounded-2xl border border-border-subtle bg-bg-surface contrast-more:border-border-input'

// Motion (DESIGN.md): only for changes, on the shared ease-out, under
// 300ms. starting: is the style each one animates from (CSS
// @starting-style), which runs when the element is put on the page.
//   ARRIVE  the list loads a moment after the page, so when it (or the
//           empty card, or the error) arrives it fades in once, all
//           together (200ms), replacing the loading notice, like the
//           Leaderboard. No rise and no row-by-row stagger: it's a list to
//           work through. Opacity only, so reduced motion keeps it.
//   RISE_IN "Saved your changes…" (and "Took … down.") is the result of a
//           press on Edit cache, so it fades in and rises 4px (200ms); with
//           reduced motion it only fades.
// The print error line fades in by itself (FieldMessage), and "Print slip"
// presses like every Button.
const ARRIVE = 'transition-opacity duration-200 ease-out starting:opacity-0'

// The line at the top after coming back from Edit cache, by what was done
// there (passed along with the page change as { kind, title }).
const NOTICE_WORDS = {
  saved: (title) => `Saved your changes to “${title}”.`,
  down: (title) => `Took “${title}” down.`,
  up: (title) => `Put “${title}” back on the map.`,
}

// One cache. Taken-down caches have no slip to print (nobody can log them),
// so they only get "Edit", which is also where they're put back on the map.
//
// slip: this row's "Print slip" state: 'idle' | 'loading' | 'error'.
function MyCacheRow({ cache, slip, onPrint }) {
  const active = cache.is_active
  const errorId = `print-error-${cache.id}`
  const place = describeCacheStats(cache)
  return (
    <li className={`${CARD} flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:gap-6`}>
      <div className="flex min-w-0 flex-1 flex-col">
        {/* The status pill sits right after the name, and drops under it
            when the name is long. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h2 className={`min-w-0 wrap-break-word text-body-strong ${active ? 'text-text-primary' : 'text-text-secondary'}`}>
            {cache.title}
          </h2>
          <StatusTag active={active} />
        </div>
        {place && <p className="mt-1 text-small text-text-secondary">{place}</p>}
        {/* Always on the page (empty until it fails), so screen readers
            read the problem out the moment it appears. */}
        <div role="alert">
          {slip === 'error' && (
            <div className="pt-2">
              <FieldMessage
                id={errorId}
                error="Couldn’t get the code to print. Check your connection and try again."
              />
            </div>
          )}
        </div>
      </div>

      {/* Phones: two equal halves (one full-width "Edit" when taken down),
          so "Getting the code…" can't push "Edit" around. Desktop: fixed
          widths at the right of the row, for the same reason. */}
      <div className={`grid gap-2 lg:flex lg:shrink-0 ${active ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {/* The cache's name follows each button's word for screen readers,
            so a list of "Edit" buttons still says which is which. */}
        <Button to={`/caches/${cache.id}/edit`} variant="secondary" className="lg:w-24">
          Edit<span className="sr-only"> {cache.title}</span>
        </Button>
        {active && (
          // While the code loads it says so and ignores more presses
          // (aria-disabled, so it stays focusable and readable). On a narrow
          // phone its words wrap onto two lines inside the 48px button.
          <Button
            variant="secondary"
            onClick={() => onPrint(cache)}
            aria-disabled={slip === 'loading' || undefined}
            aria-describedby={slip === 'error' ? errorId : undefined}
            className="min-w-0 aria-disabled:cursor-wait max-lg:whitespace-normal max-lg:px-3 max-lg:text-center lg:w-44"
          >
            {slip === 'loading' ? 'Getting the code…' : 'Print slip'}
            <span className="sr-only"> for {cache.title}</span>
          </Button>
        )}
      </div>
    </li>
  )
}

// Loading and errors: a short message in a white box, like the Journal's.
function Notice({ children, role = 'status' }) {
  return (
    <div role={role} className={`${CARD} p-4 text-body text-text-secondary`}>
      {children}
    </div>
  )
}

// No caches yet: say what this page is for, and offer the way to hide one
// (the page's one red button; the top "Hide a new cache" steps aside).
function EmptyList() {
  return (
    <div className={`${CARD} flex flex-col items-start gap-4 p-4 lg:p-6`}>
      <div className="flex flex-col gap-1">
        <h2 className="text-body-strong text-text-primary">You haven’t hidden any caches yet</h2>
        <p className="text-small text-text-secondary">
          Hide one and it shows up here, ready to edit, with a slip to print.
        </p>
      </div>
      <Button to="/caches/new" className="max-lg:w-full">
        Hide a cache
      </Button>
    </div>
  )
}

function MyCachesPage() {
  const mine = useMyCaches()
  const location = useLocation()
  const navigate = useNavigate()
  // "Print slip": which cache's code is loading or failed, and the slip
  // that's ready to print ({ title, secretCode }, with a fresh id each press
  // so printing the same slip twice still prints).
  const [printing, setPrinting] = useState({ cacheId: null, status: 'idle' })
  const [slip, setSlip] = useState(null)
  // Counts "Print slip" presses, so only the latest one prints: pressing
  // another cache's button while a code loads switches to that cache.
  const printRequest = useRef(0)
  // What was just done on Edit cache ({ kind, title }), passed along with
  // the page change. Kept here, then cleared from the history entry, so a
  // reload or coming Back doesn't show it again.
  const [arrivedNotice] = useState(() => location.state?.notice ?? null)
  // The line that's showing. It's filled in a moment after the page
  // appears, into a live region that's already there (an empty one), so
  // screen readers announce it.
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (location.state?.notice) navigate('.', { replace: true, state: null })
  }, [location.state, navigate])

  useEffect(() => {
    if (!arrivedNotice) return
    const timer = setTimeout(() => setNotice(arrivedNotice), 100)
    return () => clearTimeout(timer)
  }, [arrivedNotice])

  // Print once the slip is on the page (it's drawn below, hidden on screen).
  useEffect(() => {
    if (slip) window.print()
  }, [slip])

  async function printSlip(cache) {
    // The same cache again while its code loads: already on it.
    if (printing.status === 'loading' && printing.cacheId === cache.id) return
    const request = ++printRequest.current
    setPrinting({ cacheId: cache.id, status: 'loading' })
    try {
      const secretCode = await mine.secretCode(cache.id)
      // Another "Print slip" was pressed meanwhile: that one wins.
      if (request !== printRequest.current) return
      setPrinting({ cacheId: null, status: 'idle' })
      setSlip({ id: Date.now(), title: cache.title, secretCode })
    } catch {
      if (request !== printRequest.current) return
      setPrinting({ cacheId: cache.id, status: 'error' })
    }
  }

  const noticeText = notice ? NOTICE_WORDS[notice.kind]?.(notice.title) : null
  const signedIn = Boolean(mine.userId)
  const empty = signedIn && !mine.loading && !mine.error && mine.caches.length === 0

  let content
  if (mine.userId === null) {
    // Signed out: the login dialog opens over the page, and the list
    // appears once they've logged in (useMyCaches notices).
    content = (
      <LoginRequired task="see the caches you’ve hidden">
        This page keeps the caches you’ve hidden, so you can edit them and print their slips. Log in to see them.
      </LoginRequired>
    )
  } else if (!signedIn || mine.loading) {
    content = <Notice>Loading your caches…</Notice>
  } else if (mine.error) {
    content = (
      <Notice role="alert">
        Your caches couldn’t load. Check your connection and{' '}
        <button
          type="button"
          onClick={mine.retry}
          className={`-my-1 cursor-pointer rounded-lg py-1 font-bold text-text-primary underline ${FOCUS_RING}`}
        >
          try again
        </button>
        .
      </Notice>
    )
  } else if (empty) {
    content = <EmptyList />
  } else {
    content = (
      <ul className="flex flex-col gap-3">
        {mine.caches.map((cache) => (
          <MyCacheRow
            key={cache.id}
            cache={cache}
            slip={printing.cacheId === cache.id ? printing.status : 'idle'}
            onPrint={printSlip}
          />
        ))}
      </ul>
    )
  }

  return (
    <>
      <div className="flex min-h-dvh flex-col bg-bg-page text-text-primary print:hidden">
        <title>My caches · HuskyCache</title>
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
          <div className="flex w-full flex-col gap-4 p-4 lg:mx-auto lg:max-w-3xl lg:px-0 lg:pb-12 lg:pt-10">
            {/* min-h-12 keeps the row the same height whether or not the
                button is there. On a narrow phone the button wraps under
                the heading, so "My caches" stays on one line. */}
            <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-3">
              <h1 className="text-display text-text-primary">My caches</h1>
              {/* Signed out it would only lead to another login, and with
                  no caches the empty card offers it instead. */}
              {mine.userId !== null && !empty && (
                <Button to="/caches/new" variant="secondary" className="shrink-0">
                  Hide a new cache
                </Button>
              )}
            </div>
            <p className="text-small text-text-secondary lg:text-body">
              Caches you’ve hidden. Edit them, print a new slip, or take them down.
            </p>
            <div>
              {/* The live region is always here (empty, taking no room)
                  and the line is put inside it, so it's read out. */}
              <div role="status">
                {noticeText && (
                  <p className={`${CARD} mb-4 flex items-start gap-2 px-4 py-3 text-body text-text-primary ${RISE_IN}`}>
                    {/* Ink, not green: green only ever means "found". */}
                    <Check aria-hidden="true" size={20} strokeWidth={2.5} className="mt-0.5 shrink-0" />
                    <span className="min-w-0 wrap-break-word">{noticeText}</span>
                  </p>
                )}
              </div>
              {/* Try again goes back through loading, so whatever loads fades
                  in afresh each time. */}
              {mine.loading || !signedIn ? content : <div className={`flex flex-col gap-4 ${ARRIVE}`}>{content}</div>}
            </div>
          </div>
        </main>
      </div>
      {slip && <CacheSlip key={slip.id} cache={slip} />}
    </>
  )
}

export default MyCachesPage
