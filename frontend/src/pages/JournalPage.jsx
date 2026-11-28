import { Star } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import Button from '../components/Button.jsx'
import CacheCard from '../components/CacheCard.jsx'
import DifficultyMeter from '../components/DifficultyMeter.jsx'
import FavoriteButton from '../components/FavoriteButton.jsx'
import { FOCUS_RING } from '../components/focusRing.js'
import SiteHeader from '../components/SiteHeader.jsx'
import StarRating from '../components/StarRating.jsx'
import { placeName } from '../lib/cacheSearch.js'
import { foundDateText, foundLabel, journalTotals, pointsLabel } from '../lib/journal.js'
import { useJournal } from '../lib/useJournal.js'
import { useSavedCaches } from '../lib/useSavedCaches.js'

// Your journal: /journal. From the Figma section "Journal · /journal".
//
// Two tabs:
//   Finds      every cache you've found, newest first: its photo, name and
//              place, the day you found it, its difficulty (bars + "Difficulty
//              N"), your rating (stars) and your journal note. A find you
//              haven't rated has a "Rate it" button that opens the stars right
//              there in the entry; picking one saves it.
//   Favorites  the caches you've hearted, as cache cards (photo, place,
//              difficulty, average rating) with the heart in the corner.
// Above them, a summary of your points and how many caches you've found
// (points = each found cache's difficulty, added up).
//
// The tab is kept in the address (/journal?tab=favorites), so coming back
// from a cache's page opens the same tab. Signed-out visitors go to Log in
// and come back here. The data comes from useJournal (src/lib), which never
// loads secret_code.
//
// Phones (the base styles): one column with 16px margins. Desktop (lg:): the
// same content in a centred 768px column, with bigger photos and the
// difficulty and rating side by side.

const CARD = 'rounded-2xl border border-border-subtle bg-bg-surface contrast-more:border-border-input'
const TABS = [
  { id: 'finds', label: 'Finds' },
  { id: 'favorites', label: 'Favorites' },
]
// A quiet button: no outline, Subtle fill on hover (The Links Go Places
// Rule: an action that isn't Primary or Secondary). 40px tall to tap, with
// negative margins so it sits in a text line without making it taller.
const QUIET_BUTTON = `-my-2.5 inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-label text-text-primary hover:bg-bg-subtle active:scale-97 motion-safe:transition-[background-color,scale] motion-safe:duration-150 motion-safe:ease-out ${FOCUS_RING}`

// Loading, errors and empty lists: a short message in a white box.
function Notice({ children, role = 'status' }) {
  return (
    <div role={role} className={`${CARD} p-4 text-body text-text-secondary`}>
      {children}
    </div>
  )
}

// "Try again" inside an error message: it does something, so it's a
// button, styled as part of the sentence.
function RetryButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className={`cursor-pointer rounded-lg font-bold text-text-primary underline ${FOCUS_RING}`}>
      Try again
    </button>
  )
}

// Your points and caches found. A <dl> pairs each number with its words for
// screen readers ("points: 4"); flex-col-reverse shows the number first.
function Summary({ finds }) {
  const { points, found } = journalTotals(finds)
  const stats = [
    { value: points, label: pointsLabel(points) },
    { value: found, label: foundLabel(found) },
  ]
  return (
    <dl className="flex gap-8 rounded-2xl bg-bg-subtle p-4 lg:gap-12 lg:p-5">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col-reverse">
          <dt className="text-small text-text-secondary">{stat.label}</dt>
          <dd className="font-display text-display text-text-primary tabular-nums">{stat.value}</dd>
        </div>
      ))}
    </dl>
  )
}

// Finds / Favorites. Real tabs: arrow keys (and Home / End) move between
// them, and only the chosen one is in the Tab order. The chosen tab is the
// Inverse fill, like a selected filter chip on the map.
function Tabs({ value, onChange, idFor }) {
  const refs = useRef({})
  function handleKeyDown(event) {
    const index = TABS.findIndex((tab) => tab.id === value)
    let next = null
    if (event.key === 'ArrowRight') next = TABS[(index + 1) % TABS.length]
    else if (event.key === 'ArrowLeft') next = TABS[(index - 1 + TABS.length) % TABS.length]
    else if (event.key === 'Home') next = TABS[0]
    else if (event.key === 'End') next = TABS[TABS.length - 1]
    if (!next) return
    event.preventDefault()
    onChange(next.id)
    refs.current[next.id]?.focus()
  }
  return (
    <div role="tablist" aria-label="Your journal" onKeyDown={handleKeyDown} className="flex gap-2">
      {TABS.map((tab) => {
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            ref={(element) => {
              refs.current[tab.id] = element
            }}
            type="button"
            role="tab"
            id={idFor(tab.id, 'tab')}
            aria-selected={selected}
            aria-controls={idFor(tab.id, 'panel')}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`flex h-10 cursor-pointer items-center rounded-lg border px-4 text-label ${
              selected
                ? 'border-bg-inverse bg-bg-inverse text-text-on-accent'
                : 'border-border-strong bg-bg-surface text-text-primary hover:bg-bg-subtle'
            } ${FOCUS_RING}`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

// The entry's photo: yours if you added one to the find, otherwise the
// cache's. With neither (or one that won't load), the quiet dashed box the
// cache cards use. It fades in over a Subtle square as it arrives.
function EntryPhoto({ src }) {
  const [state, setState] = useState('loading')
  const box = 'size-20 shrink-0 rounded-lg lg:size-24'
  if (src && state !== 'failed') {
    return (
      <span className={`${box} overflow-hidden bg-bg-subtle`}>
        <img
          src={src}
          alt=""
          width={96}
          height={96}
          loading="lazy"
          decoding="async"
          onLoad={() => setState('loaded')}
          onError={() => setState('failed')}
          className={`size-full object-cover transition-opacity duration-200 ease-out ${
            state === 'loaded' ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </span>
    )
  }
  return <span aria-hidden="true" className={`${box} border-2 border-dashed border-border-subtle contrast-more:border-border-input`} />
}

// "Your rating" and the stars, or, on a find you haven't rated, a quiet
// "Rate it" button that opens the stars here. Picking a star saves it
// straight away. Cancel or Escape closes them again.
function YourRating({ find, title, canRate, onRate }) {
  const [mode, setMode] = useState('closed') // 'closed' | 'picking' | 'saving'
  const [picked, setPicked] = useState(0)
  const [error, setError] = useState('')
  const [justSaved, setJustSaved] = useState(false)
  const rateButtonRef = useRef(null)
  const pickerRef = useRef(null)
  const savedRef = useRef(null)
  // Set by "Rate it", so focus moves into the stars only when they open
  // (not when a failed save hands them back).
  const justOpened = useRef(false)

  // "Rate it" goes away as the stars open, so focus moves to the first star.
  useEffect(() => {
    if (mode !== 'picking' || !justOpened.current) return
    justOpened.current = false
    pickerRef.current?.querySelector('button')?.focus()
  }, [mode])

  // After saving, the stars are no longer buttons, so focus moves to the
  // "Rating saved" line instead of getting lost.
  useEffect(() => {
    if (justSaved) savedRef.current?.focus()
  }, [justSaved])

  async function pick(star) {
    if (mode === 'saving') return
    setPicked(star)
    setMode('saving')
    setError('')
    try {
      await onRate(star)
      setMode('closed')
      setJustSaved(true)
    } catch {
      setMode('picking')
      setError('Your rating didn’t save. Check your connection and pick again.')
    }
  }

  function open() {
    justOpened.current = true
    setMode('picking')
  }

  function close() {
    setMode('closed')
    setPicked(0)
    setError('')
    // Back to the button that opened it (it's back once this re-renders).
    requestAnimationFrame(() => rateButtonRef.current?.focus())
  }

  const label = <span className="text-small text-text-secondary">Your rating</span>

  if (find.rating) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span aria-hidden="true">{label}</span>
          <StarRating value={find.rating} label="Your rating" />
        </div>
        {justSaved && (
          <p ref={savedRef} tabIndex={-1} className="text-small text-text-secondary outline-none">
            Rating saved.
          </p>
        )}
      </div>
    )
  }

  // A taken-down cache can't be rated any more.
  if (!canRate) return null

  if (mode === 'closed') {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {label}
        <button type="button" ref={rateButtonRef} onClick={open} className={QUIET_BUTTON}>
          <Star aria-hidden="true" size={16} strokeWidth={2} />
          Rate it<span className="sr-only"> ({title})</span>
        </button>
      </div>
    )
  }

  return (
    <div
      ref={pickerRef}
      className="flex flex-col gap-2"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          close()
        }
      }}
    >
      {/* gap-y-3: if Cancel wraps (phones), its 40px tap area stays clear of the stars. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
        <span aria-hidden="true">{label}</span>
        <StarRating
          value={picked}
          onChange={pick}
          label={`Your rating for ${title}`}
        />
        {mode === 'saving' ? (
          <span role="status" className="text-small text-text-secondary">
            Saving…
          </span>
        ) : (
          <button type="button" onClick={close} className={QUIET_BUTTON}>
            Cancel
          </button>
        )}
      </div>
      {error && (
        <div role="alert" className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-error font-display text-tag text-text-on-accent"
          >
            !
          </span>
          <p className="text-small text-error">{error}</p>
        </div>
      )}
    </div>
  )
}

// One find. Like a cache card, the name is the link to the cache's page,
// stretched over the whole entry, so clicking anywhere opens it; the rating
// controls sit above that layer and stay their own buttons. A taken-down
// cache can't be opened, so its entry isn't a link and says why.
function JournalEntry({ find, onRate }) {
  const { cache } = find
  const open = Boolean(cache?.is_active)
  const title = cache?.title ?? 'A taken-down cache'
  // Nothing to show on this line for a taken-down cache you didn't rate.
  const hasDetails = Boolean(cache) || Boolean(find.rating) || open
  const titleText = 'wrap-break-word text-body-strong text-text-primary'

  return (
    <li
      className={`${CARD} relative flex items-start gap-3 p-3 lg:gap-4 lg:p-4 ${
        open
          ? 'has-[[data-card-action]:hover]:bg-bg-subtle has-[[data-card-action]:active]:scale-98 has-[[data-card-action]:focus-visible]:ring-2 has-[[data-card-action]:focus-visible]:ring-focus has-[[data-card-action]:focus-visible]:ring-offset-2 motion-safe:transition-[background-color,scale] motion-safe:duration-150 motion-safe:ease-out'
          : ''
      }`}
    >
      <EntryPhoto key={find.photo || cache?.image || 'none'} src={find.photo || cache?.image} />
      <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
        <h2 className={titleText}>
          {open ? (
            <Link
              to={`/caches/${cache.id}`}
              data-card-action
              className={`${titleText} cursor-pointer focus-visible:outline-hidden after:absolute after:inset-0 after:rounded-2xl after:content-['']`}
            >
              {title}
            </Link>
          ) : (
            title
          )}
        </h2>
        {cache?.location_name && <p className="wrap-anywhere text-small text-text-secondary">{placeName(cache.location_name)}</p>}
        <p className="text-small text-text-secondary">{foundDateText(find.foundAt)}</p>
        {!open && <p className="text-small text-text-primary">Its hider took it down, so its page can’t be opened.</p>}
        {/* Phones: difficulty above the rating. Desktop: side by side. */}
        {hasDetails && (
          <div className="relative z-10 mt-1 flex flex-col items-start gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-6">
            {cache && <DifficultyMeter level={cache.difficulty} />}
            <YourRating find={find} title={title} canRate={open} onRate={(rating) => onRate(find.id, rating)} />
          </div>
        )}
        {find.note && (
          <p className="mt-1 whitespace-pre-line wrap-break-word text-body text-text-primary">{find.note}</p>
        )}
      </div>
    </li>
  )
}

function FindsPanel({ finds, onRate }) {
  if (finds.loading) return <Notice>Loading your finds…</Notice>
  if (finds.error) {
    return (
      <Notice role="alert">
        Your finds couldn’t load. <RetryButton onClick={finds.retry} />
      </Notice>
    )
  }
  if (finds.items.length === 0) {
    return (
      <div className={`${CARD} flex flex-col items-start gap-4 p-4 lg:p-6`}>
        <p className="text-body text-text-primary">
          You haven’t found any caches yet. Each one you find shows up here, with the day you found it and your rating.
        </p>
        <Button to="/map" className="max-lg:w-full">
          Find a cache
        </Button>
      </div>
    )
  }
  return (
    <ul className="flex flex-col gap-4">
      {finds.items.map((find) => (
        <JournalEntry key={find.id} find={find} onRate={onRate} />
      ))}
    </ul>
  )
}

// keptIds: caches you unfavorited on this tab. They stay (with an empty
// heart, so you can tap it again) until you switch tabs, so nothing
// vanishes under your thumb.
function FavoritesPanel({ favorites, saved, foundIds, keptIds, onToggle }) {
  if (favorites.loading || !saved.loaded) return <Notice>Loading your favorites…</Notice>
  if (favorites.error || saved.loadError) {
    return (
      <Notice role="alert">
        Your favorites couldn’t load.{' '}
        <RetryButton
          onClick={() => {
            favorites.retry()
            saved.reload()
          }}
        />
      </Notice>
    )
  }
  const shown = favorites.items.filter((cache) => saved.isSaved(cache.id) || keptIds.includes(cache.id))
  if (shown.length === 0) {
    return (
      <div className={`${CARD} flex flex-col items-start gap-4 p-4 lg:p-6`}>
        <p className="text-body text-text-primary">
          You haven’t added any favorites yet. Tap the heart on a cache to add it.
        </p>
        <Button to="/map" variant="secondary" className="max-lg:w-full">
          Browse the map
        </Button>
      </div>
    )
  }
  return (
    <ul className="flex flex-col gap-4">
      {shown.map((cache) => (
        <li key={cache.id}>
          <CacheCard
            to={`/caches/${cache.id}`}
            title={cache.title}
            location={placeName(cache.location_name)}
            difficulty={cache.difficulty}
            image={cache.image}
            // Left out (undefined) if the ratings couldn't load, so no cache
            // looks unrated by mistake.
            rating={favorites.ratings ? (favorites.ratings[cache.id] ?? { average: null, count: 0 }) : undefined}
            found={foundIds.includes(cache.id)}
            className="lg:p-4"
            corner={
              <FavoriteButton
                title={cache.title}
                saved={saved.isSaved(cache.id)}
                signedIn
                ready={saved.loaded}
                onToggle={(source) => onToggle(cache.id, source)}
                error={saved.error}
                cacheId={cache.id}
              />
            }
          />
        </li>
      ))}
    </ul>
  )
}

function JournalPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const journal = useJournal()
  const saved = useSavedCaches(journal.userId ?? null)
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'favorites' ? 'favorites' : 'finds'
  const [keptIds, setKeptIds] = useState([])
  const baseId = useId()
  const idFor = (tabId, part) => `${baseId}-${tabId}-${part}`

  // Signed out: log in first, then come back to this tab.
  const loginLink = `/login?next=${encodeURIComponent(`/journal${location.search}`)}`
  useEffect(() => {
    if (journal.userId === null) navigate(loginLink, { replace: true })
  }, [journal.userId, loginLink, navigate])

  // replace: switching tabs doesn't add a history entry, so Back leaves the page.
  function setTab(id) {
    if (id === tab) return
    setKeptIds([])
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (id === 'finds') next.delete('tab')
        else next.set('tab', id)
        return next
      },
      { replace: true },
    )
  }

  function toggleFavorite(cacheId, source) {
    if (saved.isSaved(cacheId)) setKeptIds((current) => (current.includes(cacheId) ? current : [...current, cacheId]))
    saved.toggle(cacheId, source)
  }

  const { finds, favorites } = journal
  const foundIds = finds.items.map((find) => find.cache?.id).filter(Boolean)
  const signedIn = Boolean(journal.userId)

  return (
    <div className="flex min-h-dvh flex-col bg-bg-page text-text-primary">
      <title>Your journal · HuskyCache</title>
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
        <div className="flex w-full flex-col gap-4 p-4 lg:mx-auto lg:max-w-[768px] lg:gap-5 lg:px-0 lg:pb-12 lg:pt-10">
          <h1 className="text-title text-text-primary lg:text-display">Your journal</h1>
          {!signedIn ? (
            // Checking who's signed in (or on the way to Log in).
            <Notice>Loading your journal…</Notice>
          ) : (
            <>
              {/* The summary is about your finds, so it waits for them, and
                  isn't shown before your first find (the empty Finds tab
                  says what to do instead). */}
              {!finds.loading && !finds.error && finds.items.length > 0 && <Summary finds={finds.items} />}
              <Tabs value={tab} onChange={setTab} idFor={idFor} />
              <div role="tabpanel" id={idFor(tab, 'panel')} aria-labelledby={idFor(tab, 'tab')}>
                {tab === 'finds' ? (
                  <FindsPanel finds={finds} onRate={journal.rateFind} />
                ) : (
                  <FavoritesPanel
                    favorites={favorites}
                    saved={saved}
                    foundIds={foundIds}
                    keptIds={keptIds}
                    onToggle={toggleFavorite}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default JournalPage
