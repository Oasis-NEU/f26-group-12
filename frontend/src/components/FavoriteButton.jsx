import { Heart } from 'lucide-react'
import { useId, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { FOCUS_RING } from './focusRing.js'

// The favourite (heart) button for a cache: an ink outline heart that turns
// solid ink when it's a favourite. Ink, not a meaning colour: red, green and
// gold each already mean something (DESIGN.md's One Meaning Rule), so the
// heart is never red. Favourites stay favourites after you find them.
//
// Two looks:
//   (default)   a 40px round icon button, for cache cards, the map's popup
//               and phone card. Named "Favorite <cache>", pressed on or off.
//   labelled    a 40px outlined button with the heart and "Favorite" /
//               "Favorited", for the cache page, beside the name.
//
// Props:
//   title     the cache's name, for its label
//   saved     whether it's a favourite
//   signedIn  undefined while checking, then true or false
//   ready     whether the person's favourites have loaded (until then it
//             waits, not pressable, so a tap can't be undone by the list
//             arriving afterwards)
//   onToggle  called with this button's id (useSavedCaches' toggle)
//   error     useSavedCaches' error; shown here if this button caused it
//   cacheId   which cache this is
//
// Signed out, it's a link to Log in that comes back to this page afterwards.
// (A login dialog on the same page is planned on its own branch.)
//
// Motion, only after a tap: the fill eases in or out (150ms), and adding a
// favourite pops the heart in from 75% (150ms). The failure note fades in
// and grows from 97% out of the button's corner; it goes instantly. With
// reduced motion only the fill and the fade stay.

const SHAPE = {
  icon: 'flex size-10 shrink-0 items-center justify-center rounded-full text-text-primary',
  labelled:
    'inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-border-strong bg-bg-surface px-3 text-label text-text-primary',
}
// Only for something you can press: hover fill and the 97% press.
const PRESSABLE = `cursor-pointer hover:bg-bg-subtle active:scale-97 motion-safe:transition-[background-color,scale] motion-safe:duration-150 motion-safe:ease-out ${FOCUS_RING}`

function FavoriteButton({
  title,
  saved = false,
  signedIn,
  ready = true,
  onToggle,
  error,
  cacheId,
  labelled = false,
  className = '',
}) {
  const location = useLocation()
  const buttonId = useId()
  // Set by a tap, so only a change someone caused animates (favourites that
  // are already there when the page loads just appear).
  const [tapped, setTapped] = useState(false)
  const note = error && error.cacheId === cacheId && error.source === buttonId ? error.message : null
  const shape = SHAPE[labelled ? 'labelled' : 'icon']

  // Keyed by saved, so the icon re-mounts when it changes. After a tap,
  // adding pops it in from 75% and fades the fill in; removing fades the
  // fill out (it starts from solid). Before any tap, nothing animates.
  const heart = (
    <span
      key={saved ? 'saved' : 'not-saved'}
      className={`block ${
        tapped && saved
          ? 'motion-safe:transition-[scale] motion-safe:duration-150 motion-safe:ease-out motion-safe:starting:scale-75'
          : ''
      }`}
    >
      <Heart
        aria-hidden="true"
        size={labelled ? 18 : 20}
        strokeWidth={2}
        className={`${tapped ? 'transition-[fill] duration-150 ease-out' : ''} ${
          saved
            ? `fill-text-primary ${tapped ? 'starting:fill-transparent' : ''}`
            : `fill-transparent ${tapped ? 'starting:fill-text-primary' : ''}`
        }`}
      />
    </span>
  )
  const words = labelled && <span>{saved ? 'Favorited' : 'Favorite'}</span>

  // Still checking who's logged in, or loading their favourites: the same
  // heart, not pressable yet (no hover or press either).
  if (signedIn === undefined || (signedIn && !ready)) {
    return (
      <span aria-hidden="true" className={`${shape} ${className}`}>
        {heart}
        {words}
      </span>
    )
  }

  if (!signedIn) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`)
    return (
      <Link
        to={`/login?next=${next}`}
        aria-label={labelled ? undefined : `Log in to favorite ${title}`}
        title="Log in to add it to your favorites"
        className={`${shape} ${PRESSABLE} ${className}`}
      >
        {heart}
        {words}
      </Link>
    )
  }

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => {
          setTapped(true)
          onToggle(buttonId)
        }}
        // The icon button names the cache and says whether it's on; the
        // labelled one says it in words ("Favorited").
        aria-pressed={labelled ? undefined : saved}
        aria-label={labelled ? undefined : `Favorite ${title}`}
        title={labelled ? undefined : saved ? 'Favorited' : 'Favorite'}
        className={`${shape} ${PRESSABLE}`}
      >
        {heart}
        {words}
      </button>
      {/* A failed change, read out and shown under the button that was
          tapped (only that one). Success is said by the button itself. */}
      <span className="sr-only" aria-live="polite">
        {note ?? ''}
      </span>
      {note && (
        <span
          aria-hidden="true"
          className="absolute right-0 top-full z-20 mt-1 origin-top-right whitespace-nowrap rounded-lg bg-bg-inverse px-3 py-1.5 text-small text-text-on-accent shadow-overlay transition-[opacity,scale] duration-150 ease-out starting:opacity-0 motion-safe:starting:scale-97"
        >
          {note}
        </span>
      )}
    </span>
  )
}

export default FavoriteButton
