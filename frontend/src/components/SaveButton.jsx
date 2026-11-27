import { Bookmark } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { FOCUS_RING } from './focusRing.js'

// The save (bookmark) button for a cache: an ink outline bookmark that turns
// solid ink when saved. Ink, not a meaning colour: red, green and gold each
// already mean something (DESIGN.md's One Meaning Rule). 40px round.
//
// Props:
//   title     the cache's name, for its label ("Save Krentzman Corner")
//   saved     whether it's saved
//   signedIn  undefined while checking, then true or false
//   onToggle  saves or unsaves it (useSavedCaches' toggle)
//   error     useSavedCaches' error; shown here if it's about this cache
//   cacheId   which cache this is, to match the error
//
// Signed out, it's a link to Log in that comes back to this page afterwards.
// (A login dialog on the same page is planned on its own branch.)

const BUTTON = `flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-primary hover:bg-bg-subtle active:scale-97 motion-safe:transition-[background-color,scale] motion-safe:duration-150 motion-safe:ease-out ${FOCUS_RING}`

function SaveButton({ title, saved = false, signedIn, onToggle, error, cacheId, className = '' }) {
  const location = useLocation()
  // A save that failed: shown for 4 seconds under the button, then hidden
  // (the error it hid is remembered, so a new failure shows again).
  const [hiddenError, setHiddenError] = useState(null)
  const myError = error && error.cacheId === cacheId ? error : null
  const shownError = myError && myError !== hiddenError ? myError.message : null

  useEffect(() => {
    if (!myError) return
    const timer = setTimeout(() => setHiddenError(myError), 4000)
    return () => clearTimeout(timer)
  }, [myError])

  const icon = (
    <Bookmark
      aria-hidden="true"
      size={20}
      strokeWidth={2}
      className={saved ? 'fill-text-primary' : 'fill-transparent'}
    />
  )

  // Still checking who's logged in: the same bookmark, not yet pressable.
  if (signedIn === undefined) {
    return (
      <span aria-hidden="true" className={`${BUTTON.replace('cursor-pointer', '')} ${className}`}>
        {icon}
      </span>
    )
  }

  if (!signedIn) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`)
    return (
      <Link
        to={`/login?next=${next}`}
        aria-label={`Log in to save ${title}`}
        title="Log in to save"
        className={`${BUTTON} ${className}`}
      >
        {icon}
      </Link>
    )
  }

  return (
    <span className={`relative ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={saved}
        aria-label={`Save ${title}`}
        title={saved ? 'Saved' : 'Save'}
        className={BUTTON}
      >
        {icon}
      </button>
      {/* Read out when a save goes through or fails. */}
      <span className="sr-only" aria-live="polite">
        {shownError ?? ''}
      </span>
      {shownError && (
        <span
          aria-hidden="true"
          className="absolute right-0 top-full z-20 mt-1 whitespace-nowrap rounded-lg bg-bg-inverse px-3 py-1.5 text-small text-text-on-accent shadow-overlay"
        >
          {shownError}
        </span>
      )}
    </span>
  )
}

export default SaveButton
