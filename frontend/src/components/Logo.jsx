import { Link } from 'react-router'
import { FOCUS_RING } from './focusRing.js'

// The HuskyCache logo: a red map pin with a cache box in its head (lid,
// latch and body), meaning "a cache hidden at a spot". Red because on the map
// a red pin is a cache still to find. It replaces the old red square with an
// "N", which looked too much like Northeastern's own mark (HuskyCache is an
// unofficial student project). public/favicon.svg is the same drawing.

// Just the mark, 32px by default. Decorative: the link around it is named.
export function LogoMark({ className = 'size-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={`shrink-0 ${className}`} aria-hidden="true">
      <path d="M16 31C16 31 5 20.6 5 12.4a11 11 0 0 1 22 0C27 20.6 16 31 16 31Z" className="fill-accent" />
      {/* The box: lid, body, and the latch (pin-coloured, so it reads as a cut-out). */}
      <rect x="9" y="7.6" width="14" height="3.8" rx="1.1" className="fill-bg-surface" />
      <rect x="10" y="12.3" width="12" height="7.4" rx="1.2" className="fill-bg-surface" />
      <rect x="14.7" y="10.3" width="2.6" height="3.8" rx="0.7" className="fill-accent" />
    </svg>
  )
}

// The mark and the "HuskyCache" wordmark, linking home. Heading size on
// phones, the Wordmark style on desktop.
function Logo({ className = '' }) {
  return (
    <Link
      to="/"
      aria-label="HuskyCache home"
      className={`flex shrink-0 items-center gap-2.5 rounded-lg ${FOCUS_RING} ${className}`}
    >
      <LogoMark />
      <span aria-hidden="true" className="whitespace-nowrap text-heading text-text-primary lg:text-wordmark">
        HuskyCache
      </span>
    </Link>
  )
}

export default Logo
