import { Pencil, Plus, Star } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import Button from '../components/Button.jsx'
import CacheCard from '../components/CacheCard.jsx'
import DifficultyMeter from '../components/DifficultyMeter.jsx'
import FavoriteButton from '../components/FavoriteButton.jsx'
import { useLoginDialog } from '../components/login/loginDialogContext.js'
import LoginRequired from '../components/login/LoginRequired.jsx'
import { FOCUS_RING } from '../components/focusRing.js'
import SiteHeader from '../components/SiteHeader.jsx'
import { placeName } from '../lib/cacheSearch.js'
import { describeFindSaveError, foundDateText, foundLabel, journalTotals, pointsLabel } from '../lib/journal.js'
import { NOTE_MAX_LENGTH } from '../lib/logFind.js'
import { useJournal } from '../lib/useJournal.js'
import { useSavedCaches } from '../lib/useSavedCaches.js'

// Your journal: /journal. From the Figma section "Journal · /journal".
//
// Two tabs:
//   Finds      every cache you've found, newest first, as cards with the
//              photo on top: name, place, the day you found it, your
//              journal note, its difficulty (bars + "Difficulty N") and
//              your rating (stars), and a row of actions: "Rate it" /
//              "Change rating" opens the stars right in the card, and
//              picking one saves it; "Add a note" / "Edit note" opens the
//              same note box as the Log a find page.
//   Favorites  the caches you've hearted, as cache cards (photo, place,
//              difficulty, average rating) with the heart in the corner.
// Above them, a plain row with your points and how many caches you've
// found (points = each found cache's difficulty, added up).
//
// The tab is kept in the address (/journal?tab=favorites), so coming back
// from a cache's page opens the same tab. Signed-out visitors get the login
// dialog over the page, and the journal appears once they've logged in. The data comes from useJournal (src/lib), which never
// loads secret_code.
//
// Phones (the base styles): one column with 16px margins; the photo is 2:1
// across the top of each card. Desktop (lg:): a centred 768px column, the
// photo 3:1.

const CARD = 'rounded-2xl border border-border-subtle bg-bg-surface contrast-more:border-border-input'
const TABS = [
  { id: 'finds', label: 'Finds' },
  { id: 'favorites', label: 'Favorites' },
]
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
// reduced motion they only fade. An error line fades in (150ms). Closing
// is instant, and switching tabs
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
const TEXT_LINK = `-my-1 rounded-sm py-1 font-bold underline underline-offset-4 hover:decoration-2 ${FOCUS_RING}`

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

// Your points and caches found, as one plain row on the page (no box or
// tint), with a line saying where points come from. A <dl> pairs each
// number with its words for screen readers ("points: 4"); flex-row-reverse
// shows the number first. While the finds load it holds its space (an
// invisible copy), so nothing jumps when they arrive.
function Summary({ finds, loading }) {
  const { points, found } = journalTotals(finds)
  const stats = [
    { value: points, label: pointsLabel(points) },
    { value: found, label: foundLabel(found) },
  ]
  return (
    <div
      aria-hidden={loading || undefined}
      className={`flex flex-wrap items-baseline gap-x-6 gap-y-1 ${loading ? 'invisible' : ''}`}
    >
      <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-row-reverse items-baseline justify-end gap-1.5">
            <dt className="text-small text-text-secondary">{stat.label}</dt>
            <dd className="text-title text-text-primary tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-small text-text-secondary">Each find earns its difficulty in points.</p>
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

// The entry's photo, across the top of the card: yours if you added one to
// the find, otherwise the cache's. With neither (or one that won't load),
// there's no photo area at all, so the card starts with the name. It fades
// in over a Subtle band as it arrives, and the band holds its space.
function EntryPhoto({ src }) {
  const [state, setState] = useState('loading')
  if (!src || state === 'failed') return null
  return (
    <div className="aspect-[2/1] w-full overflow-hidden bg-bg-subtle lg:aspect-[3/1]">
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setState('loaded')}
        onError={() => setState('failed')}
        className={`size-full object-cover transition-opacity duration-200 ease-out ${
          state === 'loaded' ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  )
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
// (as in TextField). When the login ran out, "Log in again" opens the login
// dialog; once they're back in, they pick the stars or save the note again. Keyed by the message where it's used, so a repeated
// failure fades in again.
function SaveProblem({ problem, what }) {
  const { openLogin } = useLoginDialog()
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
            <button
              type="button"
              onClick={() => openLogin({ task: `save your ${what}`, expired: true })}
              aria-haspopup="dialog"
              className={`cursor-pointer ${TEXT_LINK}`}
            >
              Log in again
            </button>{' '}
            to save your {what}.
          </>
        ) : (
          problem.message
        )}
      </p>
    </div>
  )
}

// Your rating as five 20px stars, drawn like the Rating Summary's star
// (Star Gold fill with an ink outline when filled, a Border Input outline
// when empty). Each star sits in a 32px square, so the picker's stars are
// big enough to tap while the row stays small, and the read-only row and the
// picker are exactly the same size: nothing grows when you change it.
// (The shared Star Rating is 28px; these are smaller on purpose.)
//
// Without onPick it's a picture ("Your rating: 4 out of 5 stars"). With
// onPick, each star is a button ("3 stars", pressed on the chosen one), and
// a mouse hovering a star previews that rating.
function JournalStars({ value = 0, onPick, label }) {
  const [hovered, setHovered] = useState(null)
  const shown = hovered ?? value
  const star = (filled) => (
    <Star
      aria-hidden="true"
      size={20}
      strokeWidth={1.75}
      className={filled ? 'fill-highlight text-text-primary' : 'fill-transparent text-border-input'}
    />
  )
  if (!onPick) {
    return (
      <span role="img" aria-label={`${label}: ${value} out of 5 stars`} className="flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className="flex size-8 items-center justify-center">
            {star(n <= value)}
          </span>
        ))}
      </span>
    )
  }
  return (
    <span role="group" aria-label={label} className="flex" onPointerLeave={() => setHovered(null)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPick(n)}
          // Only preview for a real mouse: on a phone a tap would leave it stuck.
          onPointerEnter={(event) => event.pointerType === 'mouse' && setHovered(n)}
          aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
          aria-pressed={n === value}
          className={`flex size-8 cursor-pointer items-center justify-center rounded-lg ${FOCUS_RING}`}
        >
          {star(n <= shown)}
        </button>
      ))}
    </span>
  )
}

// The stars, open for picking (from "Rate it" or "Change rating"): the
// same 20px stars as the read-only ones, so nothing grows, with Cancel on
// the same line. Picking one saves it straight away. Focus starts on the
// star chosen now (the first if none); a held Enter can't repeat onto it
// (useHeldKeyGuard), and a click right after opening is ignored
// (OPEN_GUARD_MS). While it saves, the stars and Cancel are locked and
// Escape does nothing.
function RatingPicker({ value, title, saving, onPick, onCancel }) {
  const [picked, setPicked] = useState(value || 0)
  const ref = useRef(null)
  const openedAt = useRef(0)
  const heldKey = useHeldKeyGuard()

  // When the stars opened, for the OPEN_GUARD_MS check.
  useEffect(() => {
    openedAt.current = Date.now()
  }, [])

  useEffect(() => {
    const stars = ref.current?.querySelectorAll('[role="group"] button')
    stars?.[Math.max(0, (value || 1) - 1)]?.focus()
  }, [value])

  function pick(star) {
    if (saving || Date.now() - openedAt.current < OPEN_GUARD_MS) return
    setPicked(star)
    onPick(star)
  }

  return (
    <span
      ref={ref}
      onKeyDownCapture={heldKey.onKeyDownCapture}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        event.stopPropagation()
        if (!saving) onCancel()
      }}
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${OPEN_IN}`}
    >
      <span aria-hidden="true" className="text-small text-text-secondary">
        Your rating
      </span>
      <span className="flex items-center gap-2">
        <span aria-busy={saving || undefined} aria-disabled={saving || undefined} className={saving ? 'pointer-events-none opacity-60' : ''}>
          <JournalStars value={picked} onPick={pick} label={`Your rating for ${title}`} />
        </span>
        <button type="button" onClick={() => !saving && onCancel()} aria-disabled={saving || undefined} className={saving ? QUIET_BUTTON_LOCKED : QUIET_BUTTON}>
          Cancel
        </button>
      </span>
    </span>
  )
}

// The note box, open in place of the note (from "Add a note" or "Edit
// note"): the same box as the Log a find page (112px, "N characters left"
// near the limit), with "Save note" and Cancel. Focus goes into the box (at
// the end of the text); a held Enter can't type into it; it's locked while
// saving.
function NoteEditor({ initial, saving, onSave, onCancel }) {
  const [draft, setDraft] = useState(initial)
  const [tooLong, setTooLong] = useState(false)
  const boxRef = useRef(null)
  const heldKey = useHeldKeyGuard()
  const fieldId = useId()
  const left = NOTE_MAX_LENGTH - draft.length
  // A note saved before the limit (or elsewhere) can be longer than it; then
  // it says how much to cut instead.
  let leftText = ''
  if (left < 0) leftText = `${-left} ${left === -1 ? 'character' : 'characters'} over the limit`
  else if (left <= NOTE_WARN_AT) leftText = `${left} ${left === 1 ? 'character' : 'characters'} left`

  useEffect(() => {
    const box = boxRef.current
    box?.focus()
    box?.setSelectionRange(box.value.length, box.value.length)
  }, [])

  function save() {
    if (saving) return
    if (draft.trim().length > NOTE_MAX_LENGTH) {
      setTooLong(true)
      return
    }
    setTooLong(false)
    onSave(draft)
  }

  return (
    <div
      onKeyDownCapture={heldKey.onKeyDownCapture}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        event.stopPropagation()
        if (!saving) onCancel()
      }}
      className={`relative z-10 flex flex-col gap-2 ${OPEN_IN}`}
    >
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
      {tooLong && (
        <SaveProblem
          key="too-long"
          problem={{ needsLogin: false, message: `Notes can be up to ${NOTE_MAX_LENGTH} characters. Shorten it to save.` }}
          what="note"
        />
      )}
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
        <button type="button" onClick={() => !saving && onCancel()} aria-disabled={saving || undefined} className={saving ? QUIET_BUTTON_LOCKED : QUIET_BUTTON}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// A quiet button in the card's bottom row (no outline, Subtle fill on hover).
const ACTION = QUIET_BUTTON.replace('-my-2.5 ', '')

// One find, as a card: its photo across the top (when there is one), then
// the name, the place and the day you found it, your note (in your voice,
// with a thin rule on its left), the cache's difficulty and your rating
// (the same 20px stars whether you're looking or changing them), and one
// row of actions along the bottom, under a thin line: "Add a note" / "Edit
// note" and "Rate it" / "Change rating". Either opens its editor right in
// the card (the actions row steps aside while it's open), and focus comes
// back to the button afterwards.
//
// Like a cache card, the name is the link to the cache's page, stretched
// over the whole card, so clicking anywhere opens it; the editors and
// actions sit above that layer and stay their own buttons. A taken-down
// cache can't be opened or rated, so its card isn't a link and says why.
//
// Saving: "Saving…" and "Rating saved." / "Note saved." are said to screen
// readers only (a status line that's always on the page); a failed save
// shows its message under the card's details.
function JournalEntry({ find, onRate, onSaveNote }) {
  const { cache } = find
  const open = Boolean(cache?.is_active)
  const title = cache?.title ?? 'A taken-down cache'
  const metaId = useId()
  const difficultyId = useId()
  const titleText = 'wrap-break-word text-body-strong text-text-primary'
  const [editing, setEditing] = useState(null) // 'note' | 'rating' | null
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState(null) // { what, needsLogin, message }
  const [status, setStatus] = useState('')
  const noteButtonRef = useRef(null)
  const ratingButtonRef = useRef(null)
  // Which action button gets focus back once its editor closes.
  const returnTo = useRef(null)

  useEffect(() => {
    if (editing !== null || !returnTo.current) return
    const target = returnTo.current === 'note' ? noteButtonRef : ratingButtonRef
    returnTo.current = null
    target.current?.focus()
  }, [editing])

  function start(what) {
    setProblem(null)
    setStatus('')
    setEditing(what)
  }

  function cancel() {
    if (saving) return
    returnTo.current = editing
    setProblem(null)
    setEditing(null)
  }

  async function save(what, request) {
    setSaving(true)
    setProblem(null)
    setStatus('Saving…')
    try {
      await request()
      returnTo.current = what
      setEditing(null)
      setStatus(what === 'rating' ? 'Rating saved.' : 'Note saved.')
    } catch (error) {
      setStatus('')
      setProblem({ what, ...describeFindSaveError(error, what) })
    } finally {
      setSaving(false)
    }
  }

  let rating = null
  if (editing === 'rating') {
    rating = (
      <RatingPicker
        value={find.rating}
        title={title}
        saving={saving}
        onPick={(star) => save('rating', () => onRate(find.id, star))}
        onCancel={cancel}
      />
    )
  } else if (find.rating) {
    rating = (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span aria-hidden="true" className="text-small text-text-secondary">
          Your rating
        </span>
        <JournalStars value={find.rating} label="Your rating" />
      </span>
    )
  } else if (open) {
    rating = <span className="text-small text-text-secondary">Not rated yet</span>
  }

  return (
    <li
      className={`${CARD} relative flex flex-col overflow-hidden ${
        open
          ? 'has-[[data-card-action]:hover]:bg-bg-subtle has-[[data-card-action]:active]:scale-98 has-[[data-card-action]:focus-visible]:ring-2 has-[[data-card-action]:focus-visible]:ring-focus has-[[data-card-action]:focus-visible]:ring-offset-2 motion-safe:transition-[background-color,scale] motion-safe:duration-150 motion-safe:ease-out'
          : ''
      }`}
    >
      <EntryPhoto key={find.photo || cache?.image || 'none'} src={find.photo || cache?.image} />
      <div className="flex flex-col gap-3 p-4 lg:p-5">
        <div className="flex flex-col gap-1">
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
          <p id={metaId} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            {cache?.location_name && <span className="wrap-anywhere text-small text-text-secondary">{placeName(cache.location_name)}</span>}
            <span className="text-label text-text-primary">{foundDateText(find.foundAt)}</span>
          </p>
          {!open && <p className="text-small text-text-primary">Its hider took it down, so its page can’t be opened.</p>}
        </div>

        {editing === 'note' ? (
          <NoteEditor
            initial={find.note}
            saving={saving}
            onSave={(draft) => save('note', () => onSaveNote(find.id, draft))}
            onCancel={cancel}
          />
        ) : (
          find.note && (
            <p className="whitespace-pre-line wrap-break-word border-l-2 border-border-subtle pl-3 text-body text-text-primary contrast-more:border-border-input">
              {find.note}
            </p>
          )
        )}

        {(cache || rating) && (
          <div className="relative z-10 flex flex-wrap items-center gap-x-6 gap-y-2">
            {cache && (
              <span id={difficultyId} className="flex min-h-7 items-center">
                <DifficultyMeter level={cache.difficulty} />
              </span>
            )}
            {rating}
          </div>
        )}

        {problem && <SaveProblem key={problem.message} problem={problem} what={problem.what} />}
        {/* "Saving…", "Rating saved." and so on: for screen readers only,
            always on the page so each change is announced. */}
        <p role="status" className="sr-only">
          {status}
        </p>

        {/* The card's actions, in one row under a thin line. They step aside
            while an editor is open (it has its own Save / Cancel). */}
        {editing === null && (
          <div className="relative z-10 -mb-1 flex flex-wrap items-center gap-1 border-t border-border-subtle pt-2 contrast-more:border-border-input">
            <button type="button" ref={noteButtonRef} onClick={() => start('note')} className={`${ACTION} -ml-2.5`}>
              {find.note ? <Pencil aria-hidden="true" size={16} strokeWidth={2} /> : <Plus aria-hidden="true" size={16} strokeWidth={2} />}
              {find.note ? 'Edit note' : 'Add a note'}
              <span className="sr-only"> for {title}</span>
            </button>
            {open && (
              <button type="button" ref={ratingButtonRef} onClick={() => start('rating')} className={ACTION}>
                <Star aria-hidden="true" size={16} strokeWidth={2} />
                {find.rating ? 'Change rating' : 'Rate it'}
                <span className="sr-only"> for {title}</span>
              </button>
            )}
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
    <ul className="flex w-full flex-col gap-4">
      {finds.items.map((find) => (
        <JournalEntry key={find.id} find={find} onRate={onRate} onSaveNote={onSaveNote} />
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
            wide
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
  const journal = useJournal()
  const saved = useSavedCaches(journal.userId ?? null)
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'favorites' ? 'favorites' : 'finds'
  const [keptIds, setKeptIds] = useState([])
  const baseId = useId()
  const idFor = (tabId, part) => `${baseId}-${tabId}-${part}`


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
          {journal.userId === null ? (
            // Signed out: the login dialog opens over the page, and the
            // journal appears once they've logged in (useJournal notices).
            <LoginRequired task="see your journal">
              Your journal keeps the caches you’ve found, your ratings and notes, and your favorites. Log in to see it.
            </LoginRequired>
          ) : !signedIn ? (
            // Checking who's signed in.
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
