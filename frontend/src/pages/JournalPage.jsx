import { Pencil, Plus, Star } from 'lucide-react'
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
import { describeFindSaveError, foundDateText, foundLabel, journalTotals, pointsLabel } from '../lib/journal.js'
import { NOTE_MAX_LENGTH } from '../lib/logFind.js'
import { useJournal } from '../lib/useJournal.js'
import { useSavedCaches } from '../lib/useSavedCaches.js'

// Your journal: /journal. From the Figma section "Journal · /journal".
//
// Two tabs:
//   Finds      every cache you've found, newest first: its photo, name and
//              place, the day you found it, your journal note, its
//              difficulty (bars + "Difficulty N") and your rating (stars).
//              "Rate it" (or "Change") opens the stars right there in the
//              entry, and picking one saves it; "Add a note" (or "Edit
//              note") opens the same note box as the Log a find page.
//   Favorites  the caches you've hearted, as cache cards (photo, place,
//              difficulty, average rating) with the heart in the corner.
// Above them, a small summary of your points and how many caches you've
// found (points = each found cache's difficulty, added up).
//
// The tab is kept in the address (/journal?tab=favorites), so coming back
// from a cache's page opens the same tab. Signed-out visitors go to Log in
// and come back here. The data comes from useJournal (src/lib), which never
// loads secret_code.
//
// Phones (the base styles): one column with 16px margins; in each find,
// the note, difficulty and rating use the card's full width under the
// photo and name. Desktop (lg:): a centred 768px column, with everything
// beside the photo and the difficulty and rating side by side.

const CARD = 'rounded-2xl border border-border-subtle bg-bg-surface contrast-more:border-border-input'
const TABS = [
  { id: 'finds', label: 'Finds' },
  { id: 'favorites', label: 'Favorites' },
]
// Where "Log in again" goes when a save finds the login has run out; it
// comes back to the journal afterwards.
const LOG_IN_AGAIN = `/login?next=${encodeURIComponent('/journal')}`
// A click that lands within this long of the stars opening is ignored, so a
// double-click on "Rate it" (the first star appears where it was) can't
// save 1 star by accident.
const OPEN_GUARD_MS = 300
// Show "N characters left" once the note is this close to its limit (as on
// the Log a find page).
const NOTE_WARN_AT = 50

// Motion (DESIGN.md): only for changes someone causes, on the shared
// ease-out, under 300ms. The stars and the note box fade in and grow from
// 97% out of their top-left corner, where the button was (150ms); with
// reduced motion they only fade. New lines ("Saving…", "Rating saved.",
// an error) fade in (150ms). Closing is instant, and switching tabs
// doesn't animate (arrow keys can do it, and lists don't animate when a
// filter changes). starting: is the style it animates from (CSS
// @starting-style), so this only plays when the element appears.
const OPEN_IN =
  'origin-top-left transition-[opacity,scale] duration-150 ease-out starting:opacity-0 motion-safe:starting:scale-97'
const FADE_IN = 'transition-opacity duration-150 ease-out starting:opacity-0'
// A quiet button: no outline, Subtle fill on hover (The Links Go Places
// Rule: an action that isn't Primary or Secondary). 40px tall to tap, with
// negative margins so it sits in a text line without making it taller.
const QUIET_BUTTON = `-my-2.5 inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-label text-text-primary hover:bg-bg-subtle active:scale-97 motion-safe:transition-[background-color,scale] motion-safe:duration-150 motion-safe:ease-out ${FOCUS_RING}`
// The same button while a save is under way: it stays put (so nothing
// moves) but does nothing, with no hover or press.
const QUIET_BUTTON_LOCKED = '-my-2.5 inline-flex h-10 shrink-0 cursor-default items-center gap-1.5 rounded-lg px-2.5 text-label text-text-secondary'
const TEXT_LINK = `rounded-sm font-bold underline underline-offset-4 hover:decoration-2 ${FOCUS_RING}`

// Loading, errors and empty lists: a short message in a white box.
function Notice({ children, role = 'status' }) {
  return (
    <div role={role} className={`${CARD} p-4 text-body text-text-secondary`}>
      {children}
    </div>
  )
}

// "try again" inside an error message: it does something, so it's a
// button, styled as part of the sentence.
function RetryButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className={`cursor-pointer rounded-lg font-bold text-text-primary underline ${FOCUS_RING}`}>
      try again
    </button>
  )
}

// Your points and caches found, in one quiet row on Star Gold Soft (the
// points background; the text stays ink, never gold), with a line saying
// where points come from. A <dl> pairs each number with its words for
// screen readers ("points: 4"); flex-row-reverse shows the number first.
// While the finds load it holds its space (an invisible copy), so nothing
// jumps when they arrive.
function Summary({ finds, loading }) {
  const { points, found } = journalTotals(finds)
  const stats = [
    { value: points, label: pointsLabel(points) },
    { value: found, label: foundLabel(found) },
  ]
  return (
    <div
      aria-hidden={loading || undefined}
      className="flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-2xl bg-highlight-soft px-4 py-3 lg:px-5"
    >
      <dl className={`flex flex-wrap items-baseline gap-x-6 gap-y-1 ${loading ? 'invisible' : ''}`}>
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-row-reverse items-baseline justify-end gap-1.5">
            <dt className="text-small text-text-secondary">{stat.label}</dt>
            <dd className="text-title text-text-primary tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
      {/* At the far end on desktop; under the numbers on phones. */}
      <p className={`text-small text-text-secondary lg:ml-auto ${loading ? 'invisible' : ''}`}>
        Each find earns its difficulty in points.
      </p>
    </div>
  )
}

// Finds / Favorites. Real tabs: arrow keys (and Home / End) move between
// them, and only the chosen one is in the Tab order. The chosen tab is the
// Inverse fill, like a selected filter chip on the map. Only the chosen tab
// points at the panel (aria-controls), since only its panel is on the page.
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
            aria-controls={selected ? idFor(tab.id, 'panel') : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            // Pressing shrinks it to 97%, like a button; the fill eases (150ms).
            className={`flex h-10 cursor-pointer items-center rounded-lg border px-4 text-label active:scale-97 motion-safe:transition-[background-color,border-color,color,scale] motion-safe:duration-150 motion-safe:ease-out ${
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
// cache cards use. 80px, like the cache cards on the Favorites tab. It
// fades in over a Subtle square as it arrives.
function EntryPhoto({ src, className = '' }) {
  const [state, setState] = useState('loading')
  const box = `size-20 shrink-0 rounded-lg ${className}`
  if (src && state !== 'failed') {
    return (
      <span className={`${box} overflow-hidden bg-bg-subtle`}>
        <img
          src={src}
          alt=""
          width={80}
          height={80}
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

// Stops a held key from doing anything in something that just opened.
// Pressing Enter on "Rate it" opens the stars and moves focus onto one; if
// the key is still held, the browser repeats it on that star, which would
// save a rating nobody chose (in the note box it would type new lines).
// Repeats of the key that opened it (event.repeat, with no fresh press
// since) are ignored; any fresh press counts as normal. Call reset() when
// opening, and put onKeyDownCapture on what opened.
function useHeldKeyGuard() {
  const freshPress = useRef(false)
  return {
    reset: () => {
      freshPress.current = false
    },
    onKeyDownCapture: (event) => {
      if (!event.repeat) freshPress.current = true
      else if (!freshPress.current) event.preventDefault()
    },
  }
}

// A rating or note that didn't save, under the controls, with the "!" icon
// (as in TextField). When the login ran out, it links to Log in, which
// comes back here. Keyed by the message where it's used, so a repeated
// failure fades in again.
function SaveProblem({ problem, what }) {
  return (
    <div role="alert" className={`mt-1 flex items-start gap-2 ${FADE_IN}`}>
      <span
        aria-hidden="true"
        className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-error font-display text-[12px]/[14px] font-bold text-text-on-accent"
      >
        !
      </span>
      <p className="text-small text-error">
        {problem.needsLogin ? (
          <>
            <Link to={LOG_IN_AGAIN} className={TEXT_LINK}>
              Log in again
            </Link>{' '}
            to save your {what}.
          </>
        ) : (
          problem.message
        )}
      </p>
    </div>
  )
}

// "Saving…", "Rating saved." and so on. Always on the page (empty until
// something happens), so screen readers announce each change.
function SaveStatus({ text }) {
  return (
    <p role="status" className="text-small text-text-secondary [&:not(:empty)]:mt-1">
      {text}
    </p>
  )
}

// "Your rating" and the stars, with a quiet "Change" button; on a find you
// haven't rated, a quiet "Rate it" button instead. Either opens the five
// 28px stars right here, and picking one saves it straight away. Cancel
// or Escape closes them again. While a rating saves, the stars and Cancel
// are locked and Escape does nothing, so nothing can interrupt it.
function YourRating({ find, title, canRate, onRate }) {
  const [mode, setMode] = useState('closed') // 'closed' | 'picking' | 'saving'
  const [picked, setPicked] = useState(0)
  const [problem, setProblem] = useState(null)
  const [status, setStatus] = useState('')
  const openButtonRef = useRef(null)
  const pickerRef = useRef(null)
  const openedAt = useRef(0)
  // Where focus should go after the next change of mode.
  const focusNext = useRef(null) // 'stars' | 'button' | null
  const heldKey = useHeldKeyGuard()
  const saving = mode === 'saving'

  // Opening: the button goes away, so focus moves to the star that's
  // chosen now (the first star if none). Closing: back to the button.
  useEffect(() => {
    const target = focusNext.current
    if (target === 'stars' && mode === 'picking') {
      focusNext.current = null
      const stars = pickerRef.current?.querySelectorAll('[role="group"] button')
      stars?.[Math.max(0, (find.rating || 1) - 1)]?.focus()
    } else if (target === 'button' && mode === 'closed') {
      focusNext.current = null
      openButtonRef.current?.focus()
    }
  }, [mode, find.rating])

  function open() {
    openedAt.current = Date.now()
    heldKey.reset()
    focusNext.current = 'stars'
    setPicked(find.rating || 0)
    setProblem(null)
    setStatus('')
    setMode('picking')
  }

  function close() {
    if (saving) return
    focusNext.current = 'button'
    setProblem(null)
    setMode('closed')
  }

  async function pick(star) {
    // Locked while saving, and a click right after opening is ignored (see
    // OPEN_GUARD_MS).
    if (mode !== 'picking' || Date.now() - openedAt.current < OPEN_GUARD_MS) return
    setPicked(star)
    setMode('saving')
    setProblem(null)
    setStatus('Saving…')
    try {
      await onRate(star)
      focusNext.current = 'button'
      setMode('closed')
      setStatus('Rating saved.')
    } catch (error) {
      setMode('picking')
      setStatus('')
      setProblem(describeFindSaveError(error, 'rating'))
    }
  }

  // A taken-down cache can't be rated any more (its stars still show).
  if (!find.rating && !canRate) return null

  const label = (
    <span aria-hidden="true" className="text-small text-text-secondary">
      Your rating
    </span>
  )
  const isOpen = mode !== 'closed'
  let controls
  if (isOpen) {
    // The stars and Cancel stay together on one line (they wrap under the
    // label as a pair on very narrow screens), so Cancel never jumps.
    controls = (
      <span className="flex items-center gap-2">
        <span aria-busy={saving || undefined} aria-disabled={saving || undefined} className={saving ? 'pointer-events-none opacity-60' : ''}>
          <StarRating value={picked} onChange={pick} label={`Your rating for ${title}`} />
        </span>
        <button
          type="button"
          onClick={close}
          aria-disabled={saving || undefined}
          className={saving ? QUIET_BUTTON_LOCKED : QUIET_BUTTON}
        >
          Cancel
        </button>
      </span>
    )
  } else if (find.rating) {
    // Read-only stars at 20px (the picker's 28px are only needed to tap).
    controls = (
      <span className="flex items-center gap-2">
        <StarRating value={find.rating} label="Your rating" className="h-5 w-auto" />
        {canRate && (
          <button type="button" ref={openButtonRef} onClick={open} className={QUIET_BUTTON}>
            Change<span className="sr-only"> your rating for {title}</span>
          </button>
        )}
      </span>
    )
  } else {
    controls = (
      <button type="button" ref={openButtonRef} onClick={open} className={QUIET_BUTTON}>
        <Star aria-hidden="true" size={16} strokeWidth={2} />
        Rate it<span className="sr-only"> for {title}</span>
      </button>
    )
  }

  return (
    <div
      className="flex flex-col"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && isOpen) {
          event.stopPropagation()
          close()
        }
      }}
    >
      {/* Keyed, so opening the stars plays their entrance (and only then). */}
      <div
        key={isOpen ? 'open' : 'closed'}
        ref={pickerRef}
        onKeyDownCapture={isOpen ? heldKey.onKeyDownCapture : undefined}
        // min-h-7: as tall as the open stars, so the difficulty beside it
        // (desktop) stays level whether they're open or not.
        className={`flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1 ${isOpen ? OPEN_IN : ''}`}
      >
        {label}
        {controls}
      </div>
      <SaveStatus text={status} />
      {problem && <SaveProblem key={problem.message} problem={problem} what="rating" />}
    </div>
  )
}

// Your journal note, in your voice: set off by a thin rule on its left. A
// quiet "Add a note" / "Edit note" button opens the same note box as the
// Log a find page (112px, "N characters left" near the limit), with
// "Save note" and Cancel. Same rules as the stars: focus moves into the box
// and back, it's locked while saving, and a held Enter can't type into it.
function JournalNote({ find, title, onSave }) {
  const [mode, setMode] = useState('closed') // 'closed' | 'editing' | 'saving'
  const [draft, setDraft] = useState('')
  const [problem, setProblem] = useState(null)
  const [status, setStatus] = useState('')
  const openButtonRef = useRef(null)
  const boxRef = useRef(null)
  const focusNext = useRef(null) // 'box' | 'button' | null
  const heldKey = useHeldKeyGuard()
  const fieldId = useId()
  const saving = mode === 'saving'
  const left = NOTE_MAX_LENGTH - draft.length
  // A note saved before the limit (or elsewhere) can be longer than it; then
  // it says how much to cut instead.
  let leftText = ''
  if (left < 0) leftText = `${-left} ${left === -1 ? 'character' : 'characters'} over the limit`
  else if (left <= NOTE_WARN_AT) leftText = `${left} ${left === 1 ? 'character' : 'characters'} left`

  useEffect(() => {
    const target = focusNext.current
    if (target === 'box' && mode === 'editing') {
      focusNext.current = null
      const box = boxRef.current
      box?.focus()
      // Start typing at the end of what's there.
      box?.setSelectionRange(box.value.length, box.value.length)
    } else if (target === 'button' && mode === 'closed') {
      focusNext.current = null
      openButtonRef.current?.focus()
    }
  }, [mode])

  function open() {
    heldKey.reset()
    focusNext.current = 'box'
    setDraft(find.note)
    setProblem(null)
    setStatus('')
    setMode('editing')
  }

  function close() {
    if (saving) return
    focusNext.current = 'button'
    setProblem(null)
    setMode('closed')
  }

  async function save() {
    if (mode !== 'editing') return
    if (draft.trim().length > NOTE_MAX_LENGTH) {
      setProblem({ needsLogin: false, message: `Notes can be up to ${NOTE_MAX_LENGTH} characters. Shorten it to save.` })
      return
    }
    setMode('saving')
    setProblem(null)
    setStatus('Saving…')
    try {
      await onSave(draft)
      focusNext.current = 'button'
      setMode('closed')
      setStatus('Note saved.')
    } catch (error) {
      setMode('editing')
      setStatus('')
      setProblem(describeFindSaveError(error, 'note'))
    }
  }

  const isOpen = mode !== 'closed'

  return (
    <div
      className="flex flex-col"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && isOpen) {
          event.stopPropagation()
          close()
        }
      }}
    >
      {isOpen ? (
        <div key="open" onKeyDownCapture={heldKey.onKeyDownCapture} className={`flex flex-col gap-2 ${OPEN_IN}`}>
          <label htmlFor={fieldId} className="text-label text-text-primary">
            Journal note
          </label>
          <textarea
            id={fieldId}
            ref={boxRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            readOnly={saving}
            aria-busy={saving || undefined}
            placeholder="What was it like?"
            maxLength={NOTE_MAX_LENGTH}
            rows={4}
            aria-describedby={`${fieldId}-left`}
            className={`min-h-28 w-full resize-y rounded-lg border border-border-input bg-bg-surface px-4 py-3 text-body text-text-primary placeholder:text-text-secondary ${
              saving ? 'opacity-60' : ''
            } ${FOCUS_RING}`}
          />
          {leftText && <p className="text-small text-text-secondary">{leftText}</p>}
          {/* Always there (hidden), so screen readers hear the count once it shows. */}
          <p id={`${fieldId}-left`} className="sr-only" aria-live="polite">
            {leftText}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <Button
              variant="secondary"
              size="small"
              onClick={save}
              aria-disabled={saving || undefined}
              className={saving ? 'pointer-events-none opacity-60' : ''}
            >
              Save note
            </Button>
            <button type="button" onClick={close} aria-disabled={saving || undefined} className={saving ? QUIET_BUTTON_LOCKED : QUIET_BUTTON}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div key="closed" className="flex flex-col items-start gap-2">
          {find.note && (
            <p className="w-full whitespace-pre-line wrap-break-word border-l-2 border-border-subtle pl-3 text-body text-text-primary contrast-more:border-border-input">
              {find.note}
            </p>
          )}
          {/* -mx-2.5 lines its words up with the text above. */}
          <button type="button" ref={openButtonRef} onClick={open} className={`${QUIET_BUTTON} -mx-2.5`}>
            {find.note ? <Pencil aria-hidden="true" size={16} strokeWidth={2} /> : <Plus aria-hidden="true" size={16} strokeWidth={2} />}
            {find.note ? 'Edit note' : 'Add a note'}
            <span className="sr-only"> for {title}</span>
          </button>
        </div>
      )}
      <SaveStatus text={status} />
      {problem && <SaveProblem key={problem.message} problem={problem} what="note" />}
    </div>
  )
}

// One find. Like a cache card, the name is the link to the cache's page,
// stretched over the whole entry, so clicking anywhere opens it; the note
// and rating controls sit above that layer and stay their own buttons. A
// taken-down cache can't be opened, so its entry isn't a link and says why.
//
// A grid: the photo and the name, place and date on top; under them, the
// note, difficulty and rating across the full width on phones, and beside
// the photo (under the name) on desktop.
function JournalEntry({ find, onRate, onSaveNote }) {
  const { cache } = find
  const open = Boolean(cache?.is_active)
  const title = cache?.title ?? 'A taken-down cache'
  const metaId = useId()
  const difficultyId = useId()
  const hasDetails = Boolean(cache) || Boolean(find.rating) || open
  const titleText = 'wrap-break-word text-body-strong text-text-primary'

  return (
    <li
      className={`${CARD} relative grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-3 p-3 lg:gap-x-4 lg:gap-y-2 lg:p-4 ${
        open
          ? 'has-[[data-card-action]:hover]:bg-bg-subtle has-[[data-card-action]:active]:scale-98 has-[[data-card-action]:focus-visible]:ring-2 has-[[data-card-action]:focus-visible]:ring-focus has-[[data-card-action]:focus-visible]:ring-offset-2 motion-safe:transition-[background-color,scale] motion-safe:duration-150 motion-safe:ease-out'
          : ''
      }`}
    >
      <EntryPhoto key={find.photo || cache?.image || 'none'} src={find.photo || cache?.image} className="lg:row-span-2" />
      <div className="flex min-w-0 flex-col gap-1 pt-0.5">
        <h2 className={titleText}>
          {open ? (
            <Link
              to={`/caches/${cache.id}`}
              data-card-action
              // Screen readers hear the name first, then the place, date and
              // difficulty (as on a cache card).
              aria-describedby={`${metaId} ${difficultyId}`}
              className={`${titleText} cursor-pointer focus-visible:outline-hidden after:absolute after:inset-0 after:rounded-2xl after:content-['']`}
            >
              {title}
            </Link>
          ) : (
            title
          )}
        </h2>
        <div id={metaId} className="flex flex-col gap-1">
          {cache?.location_name && <p className="wrap-anywhere text-small text-text-secondary">{placeName(cache.location_name)}</p>}
          <p className="text-label text-text-primary">{foundDateText(find.foundAt)}</p>
        </div>
        {!open && <p className="text-small text-text-primary">Its hider took it down, so its page can’t be opened.</p>}
      </div>
      {/* Above the stretched link, so its buttons get their own clicks. */}
      {/* Two groups: your note (with its button), then the cache's
          difficulty and your rating, 16px apart. */}
      <div className="relative z-10 col-span-2 flex min-w-0 flex-col gap-4 lg:col-span-1 lg:col-start-2">
        <JournalNote find={find} title={title} onSave={(note) => onSaveNote(find.id, note)} />
        {/* Phones: difficulty above the rating. Desktop: side by side. */}
        {hasDetails && (
          <div className="flex flex-col items-start gap-1 lg:flex-row lg:flex-wrap lg:items-start lg:gap-x-6">
            {cache && (
              <span id={difficultyId} className="flex min-h-7 items-center">
                <DifficultyMeter level={cache.difficulty} />
              </span>
            )}
            <YourRating find={find} title={title} canRate={open} onRate={(rating) => onRate(find.id, rating)} />
          </div>
        )}
      </div>
    </li>
  )
}

function FindsPanel({ finds, onRate, onSaveNote }) {
  if (finds.loading) return <Notice>Loading your finds…</Notice>
  if (finds.error) {
    return (
      <Notice role="alert">
        Your finds couldn’t load. Check your connection and <RetryButton onClick={finds.retry} />.
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
    <div className="flex flex-col items-start gap-6">
      <ul className="flex w-full flex-col gap-4">
        {finds.items.map((find) => (
          <JournalEntry key={find.id} find={find} onRate={onRate} onSaveNote={onSaveNote} />
        ))}
      </ul>
      {/* Back out to the next one (Secondary: the journal has no red button
          once it has finds). */}
      <Button to="/map" variant="secondary" className="max-lg:w-full">
        Find your next cache
      </Button>
    </div>
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
        Your favorites couldn’t load. Check your connection and{' '}
        <RetryButton
          onClick={() => {
            favorites.retry()
            saved.reload()
          }}
        />
        .
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
  // The summary holds its space while the finds load, and goes once they've
  // loaded with none (the empty Finds tab says what to do instead) or
  // failed (the error says so).
  const showSummary = finds.loading || (!finds.error && finds.items.length > 0)

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
          <h1 className="text-display text-text-primary">Your journal</h1>
          {!signedIn ? (
            // Checking who's signed in (or on the way to Log in).
            <Notice>Loading your journal…</Notice>
          ) : (
            <>
              {showSummary && <Summary finds={finds.items} loading={finds.loading} />}
              <Tabs value={tab} onChange={setTab} idFor={idFor} />
              {/* tabIndex 0: the panel can take focus, so Tab from the tabs
                  lands on it even before its list has anything focusable. */}
              <div role="tabpanel" id={idFor(tab, 'panel')} aria-labelledby={idFor(tab, 'tab')} tabIndex={0} className={`rounded-2xl ${FOCUS_RING}`}>
                {tab === 'finds' ? (
                  <FindsPanel finds={finds} onRate={journal.rateFind} onSaveNote={journal.saveNote} />
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
