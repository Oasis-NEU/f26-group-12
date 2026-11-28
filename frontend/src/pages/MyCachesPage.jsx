import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import Button from '../components/Button.jsx'
import CacheSlip from '../components/CacheSlip.jsx'
import FieldMessage from '../components/cacheForm/FieldMessage.jsx'
import { FOCUS_RING } from '../components/focusRing.js'
import LoginRequired from '../components/login/LoginRequired.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { useMyCaches } from '../lib/useMyCaches.js'
import { describeCacheStats } from './myCachesData.js'

// My caches: /my-caches. From the Figma section "My caches · /my-caches".
//
// The caches you've hidden, active ones first, as plain white rows for
// managing them (no photos: it's a list to work through, not to browse).
// Each row has the cache's name, whether it's Active or Taken down, a line
// with its place, finds and average rating, then its actions: "Edit", and
// "Print slip" for an active cache, which prints the same slip as "Cache
// hidden!" (CacheSlip). The secret code is loaded only when "Print slip" is
// pressed, from cache_secrets (only the hider can read it); the list itself
// never selects it. "Hide a new cache" sits at the top.
//
// After "Save changes" on Edit cache, people land back here with a line
// saying it saved. Signed-out visitors get the login dialog over the page,
// and the list appears once they've logged in. The data comes from
// useMyCaches (src/lib).
//
// Phones (the base styles): each row stacks, with its buttons sharing a
// full-width line underneath. Desktop (lg:): a centred 768px column, and
// each row lays out across: name and details on the left, buttons on the
// right.

const CARD = 'rounded-2xl border border-border-subtle bg-bg-surface contrast-more:border-border-input'

// "Active" or "Taken down" as a small pill (rounded-full, so it never reads
// as one of the 8px-cornered buttons beside it). Active is outlined in ink;
// Taken down is the quieter Subtle fill. The word says it either way.
function StatusTag({ active }) {
  return active ? (
    <span className="shrink-0 rounded-full border border-border-strong bg-bg-surface px-2.5 py-0.5 text-tag text-text-primary">
      Active
    </span>
  ) : (
    <span className="shrink-0 rounded-full border border-transparent bg-bg-subtle px-2.5 py-0.5 text-tag text-text-secondary">
      Taken down
    </span>
  )
}

// One cache. Taken-down caches have no slip to print (nobody can log them),
// so they only get "Edit", which is also where they're put back on the map.
//
// slip: this row's "Print slip" state: 'idle' | 'loading' | 'error'.
function MyCacheRow({ cache, slip, onPrint }) {
  const active = cache.is_active
  const errorId = `print-error-${cache.id}`
  return (
    <li className={`${CARD} flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:gap-4`}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className={`min-w-0 wrap-break-word text-body-strong ${active ? 'text-text-primary' : 'text-text-secondary'}`}>
            {cache.title}
          </h2>
          <StatusTag active={active} />
        </div>
        <p className="text-small text-text-secondary">{describeCacheStats(cache)}</p>
        {slip === 'error' && (
          <div className="pt-1">
            <FieldMessage
              id={errorId}
              error="Couldn’t get the code to print. Check your connection and try again."
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 lg:shrink-0">
        {/* The cache's name follows each button's word for screen readers,
            so a list of "Edit" buttons still says which is which. */}
        <Button to={`/caches/${cache.id}/edit`} variant="secondary" className="flex-1 lg:flex-none">
          Edit<span className="sr-only"> {cache.title}</span>
        </Button>
        {active && (
          // While the code loads it says so and ignores more presses
          // (aria-disabled, so it stays focusable and readable).
          <Button
            variant="secondary"
            onClick={() => onPrint(cache)}
            aria-disabled={slip === 'loading' || undefined}
            aria-describedby={slip === 'error' ? errorId : undefined}
            className="flex-1 aria-disabled:cursor-wait lg:flex-none"
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
          Hide one and it shows up here, with its finds and ratings and a slip to print.
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
  // The title of the cache just saved on Edit cache, passed along with the
  // page change. Kept here, then cleared from the history entry, so a reload
  // or coming Back doesn't show it again.
  const [savedTitle] = useState(() => location.state?.savedTitle ?? null)

  useEffect(() => {
    if (location.state?.savedTitle) navigate('.', { replace: true, state: null })
  }, [location.state, navigate])

  // Print once the slip is on the page (it's drawn below, hidden on screen).
  useEffect(() => {
    if (slip) window.print()
  }, [slip])

  async function printSlip(cache) {
    if (printing.status === 'loading') return
    setPrinting({ cacheId: cache.id, status: 'loading' })
    try {
      const secretCode = await mine.secretCode(cache.id)
      setPrinting({ cacheId: null, status: 'idle' })
      setSlip({ id: Date.now(), title: cache.title, secretCode })
    } catch {
      setPrinting({ cacheId: cache.id, status: 'error' })
    }
  }

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
        <button type="button" onClick={mine.retry} className={`cursor-pointer rounded-lg font-bold text-text-primary underline ${FOCUS_RING}`}>
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
          <div className="flex w-full flex-col gap-4 p-4 lg:mx-auto lg:max-w-[768px] lg:px-0 lg:pb-12 lg:pt-10">
            {/* min-h-12 keeps the row the same height whether or not the
                button is there. */}
            <div className="flex min-h-12 items-center justify-between gap-4">
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
            {savedTitle && (
              <p role="status" className={`${CARD} flex items-start gap-2 px-4 py-3 text-body text-text-primary`}>
                {/* Ink, not green: green only ever means "found". */}
                <Check aria-hidden="true" size={20} strokeWidth={2.5} className="mt-0.5 shrink-0" />
                <span className="min-w-0 wrap-break-word">Saved your changes to “{savedTitle}”.</span>
              </p>
            )}
            {content}
          </div>
        </main>
      </div>
      {slip && <CacheSlip key={slip.id} cache={slip} />}
    </>
  )
}

export default MyCachesPage
