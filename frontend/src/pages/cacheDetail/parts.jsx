import { Link } from 'react-router'
import checkIcon from '../../assets/figma/check.svg'
import chevronLeft from '../../assets/figma/chevron-left.svg'
import Button from '../../components/Button.jsx'
import DifficultyMeter from '../../components/DifficultyMeter.jsx'
import HintRow from '../../components/HintRow.jsx'
import { FOCUS_RING } from '../../components/focusRing.js'
import { formatFoundDate } from '../cacheDetailData.js'
import { cacheCoordinates } from './coords.js'
import { getHintRows, hintsLeftText } from './hintRows.js'

// Pieces every version of the cache detail page shares. The versions only
// change how these are arranged and dressed, never what they say.

// The padding makes the tap area 44px tall (comfortable while walking); the
// matching negative margins keep the link where it was in the layout.
export function BackLink() {
  return (
    <Link
      to="/"
      className={`-mx-2 -my-3 flex w-fit items-center gap-2 rounded-lg px-2 py-3 text-label text-text-secondary hover:text-text-primary ${FOCUS_RING}`}
    >
      {/* Figma's chevron is 8 x 14 and overflows its 6 x 12 box a little. */}
      <span className="relative h-3 w-1.5 shrink-0" aria-hidden="true">
        <img src={chevronLeft} width={8} height={14} alt="" className="absolute inset-[-8.33%_-16.67%] block max-w-none" />
      </span>
      Back to map
    </Link>
  )
}

// The cache's photo, or, when it has none, an empty "spot on the map".
// className sets the photo's size and corners; emptyClassName the empty one's.
//
// The empty state is shorter than a photo, so the page doesn't open on a big
// blank box. It's see-through with a dashed edge (dashed means "not reached
// yet", as on the hint trail), so the contour rings behind it show around the
// pin, and it says what to do instead of looking at a photo.
export function CachePhoto({
  cache,
  className = 'h-[180px] rounded-2xl lg:h-[400px]',
  emptyClassName = 'h-[7.5rem] rounded-2xl lg:h-[15rem]',
}) {
  if (!cache.image) {
    return (
      <div
        className={`flex w-full flex-col items-center justify-center gap-1 border-2 border-dashed border-border-input px-12 text-center contrast-more:border-text-secondary ${emptyClassName}`}
      >
        {/* A taken-down cache can't be hunted, so it gets no "yet" and no pointer to the hints. */}
        <p className="text-body-strong text-text-primary">
          {cache.is_active ? 'No photo of this spot yet' : 'No photo of this spot'}
        </p>
        {/* The location itself is shown just below, in the legend strip, and
            is often written as "near ...", so it isn't repeated here. */}
        {cache.is_active && <p className="text-small text-text-secondary">Use the location and hints to find it.</p>}
      </div>
    )
  }
  return <img src={cache.image} alt={`Photo of the area around ${cache.title}`} className={`w-full object-cover ${className}`} />
}

export function CacheTitle({ cache, className = 'text-title lg:text-display' }) {
  // wrap-break-word lets a very long word (no spaces) break instead of running off a phone screen.
  return <h1 className={`wrap-break-word text-text-primary ${className}`}>{cache.title}</h1>
}

// Location and difficulty. Phones spread them across the row; desktop
// keeps them together on the left.
export function MetaRow({ cache, className = '' }) {
  return (
    <div className={`flex items-center justify-between gap-4 lg:justify-start lg:gap-6 ${className}`}>
      {cache.location_name && (
        // The location is what you act on outdoors, so it's the strongest line
        // in the strip (Body Strong, primary), on every screen size.
        <p className="min-w-0 wrap-anywhere text-body-strong text-text-primary">{cache.location_name}</p>
      )}
      <DifficultyMeter level={cache.difficulty} />
    </div>
  )
}

export function Description({ cache }) {
  if (!cache.description) return null
  return <p className="whitespace-pre-line wrap-break-word text-body text-text-primary lg:max-w-[640px]">{cache.description}</p>
}

// headingId lets the hints card be labelled by this heading.
export function HintsHeader({ detail, headingId }) {
  const status = hintsLeftText(detail.hintCount, Object.keys(detail.revealed).length)
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 id={headingId} className="text-heading text-text-primary">
        Hints
      </h2>
      {status && <p className="text-small text-text-secondary">{status}</p>}
    </div>
  )
}

// The hint rows, or a message when there aren't any. A version can pass
// renderRows to arrange the rows its own way; rows come from getHintRows.
export function HintsList({ detail, renderRows = defaultRows }) {
  const rows = getHintRows(detail.hintCount, detail.revealed, detail.pendingOrder)
  return (
    <>
      {detail.hintCountError ? (
        <p className="text-small text-text-secondary">
          Hints couldn’t load right now.{' '}
          <button
            type="button"
            onClick={detail.retry}
            className={`cursor-pointer rounded-sm font-bold text-text-primary underline underline-offset-4 ${FOCUS_RING}`}
          >
            Try again
          </button>
        </p>
      ) : detail.hintCount === 0 ? (
        <p className="text-small text-text-secondary">This cache doesn’t have any hints.</p>
      ) : (
        renderRows(rows, detail.revealHint)
      )}
      {detail.hintError && (
        <p role="alert" className="text-small text-error">
          {detail.hintError}
        </p>
      )}
    </>
  )
}

export function HintRowFor({ row, onReveal, className }) {
  return (
    <HintRow
      number={row.order}
      text={row.text}
      revealed={row.revealed}
      canReveal={row.canReveal}
      revealing={row.revealing}
      onReveal={() => onReveal(row.order)}
      className={className}
    />
  )
}

function defaultRows(rows, onReveal) {
  return (
    <ol className="flex flex-col gap-2">
      {rows.map((row) => (
        <li key={row.order}>
          <HintRowFor row={row} onReveal={onReveal} />
        </li>
      ))}
    </ol>
  )
}

// "I found it", or, once you've found it, "Found by you on Oct 30" with a
// checkmark (the design's "already found" state). For the person who hid the
// cache it says "You hid this cache" with an Edit link instead: they know the
// code, so logging their own cache wouldn't prove anything.
export function FindAction({ cacheId, find, isHider = false, checking = false }) {
  // While we're still checking whether this person found it (or hid it),
  // hold the space with a quiet placeholder instead of guessing.
  if (checking) {
    return <div aria-hidden="true" className="h-12 rounded-lg bg-bg-subtle" />
  }
  if (isHider) {
    return (
      <div className="flex h-12 items-center justify-between gap-3 rounded-lg bg-bg-subtle px-4">
        <p className="text-body-strong text-text-primary">You hid this cache</p>
        {/* Padding makes the tap area 44px tall; negative margins keep the row's height. */}
        <Link
          to={`/caches/${cacheId}/edit`}
          className={`-mx-2 -my-3 rounded-lg px-2 py-3 text-label text-text-primary underline underline-offset-4 ${FOCUS_RING}`}
        >
          Edit cache
        </Link>
      </div>
    )
  }
  if (find) {
    return (
      <p className="flex h-12 items-center justify-center gap-2 rounded-lg bg-found-soft text-body-strong text-found">
        <img src={checkIcon} width={11.75} height={8.75} alt="" />
        Found by you on {formatFoundDate(find.created_at)}
      </p>
    )
  }
  return (
    <Button to={`/caches/${cacheId}/log`} fullWidth>
      I found it
    </Button>
  )
}

// Walking directions to the cache in Google Maps (on phones this opens the
// Maps app). It's a plain link with the coordinates, so no API key is needed
// and nothing is stored. Hidden if the cache has no valid coordinates.
export function DirectionsLink({ cache }) {
  const position = cacheCoordinates(cache)
  if (!position) return null
  const { lat, lng } = position
  return (
    <Button
      variant="secondary"
      href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
      target="_blank"
      rel="noopener noreferrer"
      fullWidth
      className="lg:w-fit"
    >
      Get directions<span className="sr-only"> (opens Google Maps)</span>
    </Button>
  )
}

// Under "I found it": how the proof step works (the find counts because you
// enter the code from the slip inside), and, for signed-out visitors, that
// logging needs an account. Only shown while the cache can still be logged by
// this person (not found yet, not their own cache).
export function FindHelp({ signedIn, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 text-small text-text-secondary ${className}`}>
      <p>
        Found it? Open it, find the 6-character code on the slip, then <span className="lg:hidden">tap</span>
        <span className="hidden lg:inline">click</span> “I found it”. Put it back where it was.
      </p>
      {signedIn === false && (
        <p>
          <Link to="/login" className={`rounded-sm font-bold text-text-primary underline underline-offset-4 ${FOCUS_RING}`}>
            Log in
          </Link>{' '}
          to log your find.
        </p>
      )}
    </div>
  )
}

// The design's "taken down" state: this replaces the hints and the button.
export function TakenDownNotice({ className = '' }) {
  return (
    <p
      className={`rounded-2xl border border-border-subtle bg-bg-surface p-4 text-body text-text-primary contrast-more:border-border-input ${className}`}
    >
      This cache has been taken down, so it can’t be logged anymore.
    </p>
  )
}

// Phones: the action is pinned to the bottom of the screen.
// className lets a version change the bar's top edge.
export function PhoneActionBar({ cacheId, find, isHider, checking, className = 'border-t border-border-subtle' }) {
  return (
    <div className={`sticky bottom-0 z-20 bg-bg-surface p-4 lg:hidden ${className}`}>
      <FindAction cacheId={cacheId} find={find} isHider={isHider} checking={checking} />
    </div>
  )
}
