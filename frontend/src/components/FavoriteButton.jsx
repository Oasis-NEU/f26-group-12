import { Heart } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { FOCUS_RING } from './focusRing.js'
import { useLoginDialog } from './login/loginDialogContext.js'
import {
  isPendingHeart,
  requestFavorite,
  restartPendingClock,
  subscribePendingFavorite,
  takePendingFavorite,
} from './login/pendingFavorite.js'

// The favourite (heart) button for a cache: an ink outline heart that turns
// solid rose pink (Favorite Pink) when it's a favourite. Pink, not red: red
// already means "to find" and the main action (DESIGN.md's One Meaning
// Rule), so favourites get their own colour, used for nothing else.
// Favourites stay favourites after you find them.
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
// Signed out, it opens the login dialog over the page ("Log in to add
// Krentzman Corner to your favorites."). Once they've logged in, this cache
// becomes a favourite by itself (pendingFavorite.js): the heart they tapped
// fills as soon as their favourites have loaded, and focus comes back to
// it.
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
  const { openLogin } = useLoginDialog()
  const buttonId = useId()
  const buttonRef = useRef(null)
  // Set by a tap, so only a change someone caused animates (favourites that
  // are already there when the page loads just appear).
  const [tapped, setTapped] = useState(false)
  const note = error && error.cacheId === cacheId && error.source === buttonId ? error.message : null
  const shape = SHAPE[labelled ? 'labelled' : 'icon']

  // The favourite someone asked for before logging in (see the top of the
  // file). Once they're logged in and their favourites have loaded, add it
  // (unless it already is one) and put focus back on the heart. The heart
  // they tapped takes it straight away; if that one's gone, the other
  // hearts for this cache wait a frame (so the tapped one can go first),
  // then the first one that's on screen takes it (not a hidden copy, e.g.
  // the list's card under the phone map). It checks now and whenever the
  // pending favourite changes (it can be asked for just after this heart
  // appears).
  useEffect(() => {
    if (!signedIn || !ready) return
    let frame = 0
    function finish() {
      if (!takePendingFavorite(cacheId)) return
      buttonRef.current?.focus({ preventScroll: true })
      if (!saved) {
        setTapped(true)
        onToggle?.(buttonId)
      }
    }
    function check() {
      cancelAnimationFrame(frame)
      if (isPendingHeart(cacheId, buttonId)) return finish()
      frame = requestAnimationFrame(() => {
        if (buttonRef.current?.getClientRects().length) finish()
      })
    }
    check()
    const unsubscribe = subscribePendingFavorite(check)
    return () => {
      cancelAnimationFrame(frame)
      unsubscribe()
    }
  }, [signedIn, ready, cacheId, saved, onToggle, buttonId])

  // While their favourites are still loading after logging in (slow signal),
  // the pending favourite's 15 seconds don't run out: they start once the
  // list is here (or this heart goes away).
  useEffect(() => {
    if (!signedIn || ready) return
    return () => restartPendingClock(cacheId)
  }, [signedIn, ready, cacheId])

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
        className={`${tapped ? 'transition-[fill,color] duration-150 ease-out' : ''} ${
          saved
            ? `fill-favorite text-favorite ${tapped ? 'starting:fill-transparent starting:text-text-primary' : ''}`
            : `fill-transparent text-text-primary ${tapped ? 'starting:fill-favorite starting:text-favorite' : ''}`
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

  // Signed out: open the login dialog; logging in finishes the favourite.
  if (!signedIn) {
    return (
      <button
        type="button"
        onClick={() =>
          openLogin({
            task: `add ${title} to your favorites`,
            onLoggedIn: () => requestFavorite(cacheId, buttonId),
          })
        }
        aria-haspopup="dialog"
        // The same words for the name and the hover tip, so a screen reader
        // doesn't read two versions.
        aria-label={labelled ? undefined : `Log in to favorite ${title}`}
        title={labelled ? 'Log in to add it to your favorites' : `Log in to favorite ${title}`}
        className={`${shape} ${PRESSABLE} ${className}`}
      >
        {heart}
        {words}
      </button>
    )
  }

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        ref={buttonRef}
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
