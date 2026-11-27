import { useState } from 'react'
import { Link } from 'react-router'
import checkIcon from '../assets/figma/check.svg'
import DifficultyMeter from './DifficultyMeter.jsx'
import { FOCUS_RING } from './focusRing.js'
import RatingSummary from './RatingSummary.jsx'

// A cache in a list, from the Figma "CacheCard" component (reworked
// 2026-11-27: photo, rating, difficulty on its own line). Used in the map's
// list, and anywhere caches are listed.
//
// Layout: an 80px photo of the spot on the left (an empty dashed box when
// there's no photo yet, dashed meaning "not there yet"), then the name (and
// the found tag), the place, and a line with the difficulty and the average
// rating.
//
// Props: title, location, difficulty, image (photo URL, optional), rating
// ({ average, count } from loadCacheRatings; leave it out if ratings
// couldn't load, and the rating isn't shown), found, selected, to / onClick.
//
// Figma variants -> props:
//   Found: true        -> found      (shows the "Found by you" tag)
//   State: Selected    -> selected   (matches the pin someone clicked on the map)
//   State: Hover       -> hover: classes (automatic)
//
// It renders the right element for the job:
//   <CacheCard to="/caches/abc" ... />     -> <Link>, an <a> (opens the cache page)
//   <CacheCard onClick={select} ... />     -> <button> (e.g. selects it on the map)
//   neither                                -> a plain box
// Everything inside is a <span> because a <button> can't contain <p> or <div>.

// The "Found by you" pill (Figma "FoundByYouTag"), on its own so other
// places, like the map's cache card, can show the same tag.
export function FoundTag() {
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-found-soft py-[3px] pl-2 pr-3">
      {/* Figma's check is 11.75 x 8.75 and overflows its 10 x 7 box a little. */}
      <span className="relative h-[7px] w-[10px] shrink-0" aria-hidden="true">
        <img
          src={checkIcon}
          width={11.75}
          height={8.75}
          alt=""
          className="absolute inset-[-12.5%_-8.75%] block max-w-none"
        />
      </span>
      <span className="whitespace-nowrap text-tag text-found">Found by you</span>
    </span>
  )
}

// The photo, or the empty dashed box. A photo that fails to load falls back
// to the box. Decorative: the card's text already names the cache.
//
// While it downloads, the Subtle square holds its place (so nothing moves),
// and the photo fades in over it when it arrives (200ms) instead of popping
// in. A fade isn't movement, so it stays with reduced motion on.
function CardPhoto({ image }) {
  const [state, setState] = useState('loading')
  const box = 'size-20 shrink-0 rounded-lg'
  if (image && state !== 'failed') {
    return (
      <span className={`${box} overflow-hidden bg-bg-subtle`}>
        <img
          src={image}
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
  return (
    <span
      aria-hidden="true"
      className={`${box} border-2 border-dashed border-border-input bg-bg-page contrast-more:border-text-secondary`}
    />
  )
}

function CacheCard({
  title,
  location,
  difficulty,
  image,
  rating,
  found = false,
  selected = false,
  to,
  onClick,
  className = '',
}) {
  const isInteractive = Boolean(to || onClick)
  // Motion: hover fills and the selected outline ease in (150ms), and a
  // clickable card shrinks to 98% while pressed (a bit less than a button's
  // 97%, since it's bigger), so a tap feels heard. The list itself doesn't
  // animate when a search or filter changes it: that happens as you type.
  const classes = [
    'flex w-full items-start gap-3 rounded-2xl border border-border-subtle bg-bg-surface p-3 text-left motion-safe:transition-[background-color,border-color,box-shadow,scale] motion-safe:duration-150 motion-safe:ease-out',
    // Selected is a 2px dark border in Figma. The 1px border plus a 1px inset
    // ring looks the same, so the card doesn't grow.
    selected ? 'border-border-strong inset-ring-1 inset-ring-border-strong' : '',
    isInteractive && !selected ? 'hover:bg-bg-subtle' : '',
    isInteractive ? `cursor-pointer active:scale-98 ${FOCUS_RING}` : '',
    className,
  ].join(' ')

  const content = (
    <>
      <CardPhoto key={image} image={image} />
      <span className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
        <span className="flex w-full items-start gap-3">
          <span className="min-w-0 flex-1 wrap-break-word text-body-strong text-text-primary">{title}</span>
          {found && <FoundTag />}
        </span>
        {location && <span className="text-small text-text-secondary">{location}</span>}
        {/* Fits on one line in the 400px desktop list, even with "No ratings yet". */}
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <DifficultyMeter level={difficulty} />
          <RatingSummary rating={rating} />
        </span>
      </span>
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={selected} className={classes}>
        {content}
      </button>
    )
  }

  return <div className={classes}>{content}</div>
}

export default CacheCard
