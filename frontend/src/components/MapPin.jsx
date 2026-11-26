import pinFound from '../assets/figma/pin-found.svg'
import pinFoundSelected from '../assets/figma/pin-found-selected.svg'
import { FOCUS_RING } from './focusRing.js'

// A cache on the map, from the Figma "MapPin" component.
//
// Figma variants -> props:
//   Found: true    -> found     (a cache you've found: dark with a check)
//   Selected: true -> selected  (bigger, with a ring)
//
// Red = a cache you haven't found yet. The found pins are the exact SVGs
// exported from Figma (in src/assets/figma).
//
// Inside a Google Maps <AdvancedMarker>, the marker already handles clicks,
// so use the pin on its own:  <AdvancedMarker onClick={...}><MapPin found /></AdvancedMarker>
// Anywhere else, pass onClick and a label and it becomes a real <button>:
//   <MapPin onClick={select} label="Quad riddle" />

// Hover grows the pin a little so you can tell which one you're pointing at
// (the gold ring already means "selected"). It animates only when the
// person hasn't asked their device for reduced motion.
const HOVER = 'hover:scale-110 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out'

function MapPin({ found = false, selected = false, onClick, label, className = '' }) {
  let pin
  if (found) {
    // The SVGs include the shadow, so they're bigger than the pin and hang
    // over its edges by the same amounts as in Figma. The outer box is in
    // rem, and the inner span stretches past it by percentages, so the
    // artwork grows with the pin when someone makes their text bigger
    // (as in Figma's own export: a positioned box, image filling it).
    pin = (
      <span className={`relative block ${selected ? 'size-10' : 'size-7'}`}>
        <span
          className={`absolute block ${
            selected ? 'inset-[-15%_-17.5%_-20%_-17.5%]' : 'inset-[-14.29%_-17.86%_-21.43%_-17.86%]'
          }`}
        >
          <img
            src={selected ? pinFoundSelected : pinFound}
            width={selected ? 54 : 38}
            height={selected ? 54 : 38}
            alt=""
            className="block size-full max-w-none"
          />
        </span>
      </span>
    )
  } else {
    pin = (
      <span
        className={`block rounded-full bg-accent shadow-pin ${
          selected ? 'size-10 border-4 border-highlight' : 'size-7 border-2 border-bg-surface'
        }`}
      />
    )
  }

  if (onClick) {
    const state = found ? 'found' : 'not found yet'
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`${label}, ${state}`}
        aria-pressed={selected}
        className={`block cursor-pointer rounded-full ${HOVER} ${FOCUS_RING} ${className}`}
      >
        {pin}
      </button>
    )
  }

  return (
    // Inside a map marker the marker is what gets clicked, but the pin still
    // reacts to hover so it feels clickable.
    <span aria-hidden="true" className={`block ${HOVER} ${className}`}>
      {pin}
    </span>
  )
}

export default MapPin
