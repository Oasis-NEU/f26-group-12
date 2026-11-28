import { useState } from 'react'
import stars0 from '../assets/figma/stars-0.svg'
import stars1 from '../assets/figma/stars-1.svg'
import stars2 from '../assets/figma/stars-2.svg'
import stars3 from '../assets/figma/stars-3.svg'
import stars4 from '../assets/figma/stars-4.svg'
import stars5 from '../assets/figma/stars-5.svg'
import { FOCUS_RING } from './focusRing.js'

// Five stars, from the Figma "StarRating" component.
//
// Figma variants -> props:
//   Value: 0-5 -> value={3}
//
// Ratings are always stars, never bars, so they can't be confused with
// difficulty. The star pictures are the SVGs exported from Figma (one per
// value) in src/assets/figma, recoloured: filled stars are solid ink (they
// were gold), empty ones Border Input outlines.
//
// Two ways to use it:
//   <StarRating value={4} />                          shows a rating
//   <StarRating value={rating} onChange={setRating} /> lets someone pick one
// When onChange is given, each star is a real <button> (28px, big enough to
// tap), laid exactly over the star in the picture. Hovering a star with a
// mouse previews that rating before you click.

const STAR_IMAGES = [stars0, stars1, stars2, stars3, stars4, stars5]

function StarRating({ value = 0, onChange, label = 'Rating', className = '' }) {
  // The star the mouse is over (1-5), or null. Only used while picking.
  const [hovered, setHovered] = useState(null)
  const stars = Math.min(5, Math.max(0, Math.round(Number(value)) || 0))
  const description = `${stars} out of 5 stars`

  // Only preview for a real mouse: on a phone, a tap would otherwise leave
  // the preview stuck after the finger lifts.
  function previewStar(event, star) {
    if (event.pointerType === 'mouse') setHovered(star)
  }

  if (!onChange) {
    return (
      <img
        src={STAR_IMAGES[stars]}
        width={172}
        height={28}
        alt={`${label}: ${description}`}
        className={`block ${className}`}
      />
    )
  }

  return (
    <div role="group" aria-label={label} className={`relative h-7 w-[172px] ${className}`}>
      <img src={STAR_IMAGES[hovered ?? stars]} width={172} height={28} alt="" className="block" />
      {/* Five 28px buttons with 8px gaps: the same spacing as the stars. */}
      <div className="absolute inset-0 flex gap-2" onPointerLeave={() => setHovered(null)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onPointerEnter={(event) => previewStar(event, star)}
            aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
            aria-pressed={star === stars}
            className={`size-7 shrink-0 cursor-pointer rounded-lg ${FOCUS_RING}`}
          />
        ))}
      </div>
    </div>
  )
}

export default StarRating
