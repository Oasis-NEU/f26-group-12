import MapPin from '../../components/MapPin.jsx'
import { HintRowFor } from './parts.jsx'

// The hints as stops on a trail that leads to the cache. Each hint has a
// marker; the path is solid where you've been and dashed ahead. Past the last
// hint the trail ends at the cache's map pin (green once you've found it),
// with "I found it" beside it on desktop. On phones the pin sits alone and
// the button stays in the bottom bar.
//
// contrast-more: classes apply when someone turns on Increase Contrast
// (iPhone: Settings > Accessibility > Display & Text Size). They darken the
// dashes and rings so the trail stays visible in bright sun.

const WALKED = 'border-solid border-text-primary'
const AHEAD = 'border-dashed border-border-input contrast-more:border-text-secondary'

// The background matches what's behind it (page on phones, the white card on
// desktop) so the path line doesn't show through the hollow markers.
function TrailMarker({ row }) {
  if (row.revealed) {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-bg-inverse">
        <span className="size-2 rounded-full bg-bg-surface" />
      </span>
    )
  }
  return (
    <span
      className={`block size-6 shrink-0 rounded-full border-2 bg-bg-page lg:bg-bg-surface ${
        row.canReveal ? 'border-text-primary' : 'border-border-input contrast-more:border-text-secondary'
      }`}
    />
  )
}

// rows come from getHintRows (hintRows.js). action is the "I found it"
// button (or the "Found by you" line) shown beside the end pin on desktop.
// drawTo is the hint someone just tapped: only the segment leading to it
// animates. Segments walked for any other reason (e.g. the found check
// arriving after the page loads) just appear solid.
function HintTrail({ rows, onReveal, found, action, drawTo = null }) {
  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col gap-2">
        {rows.map((row, index) => {
          const next = rows[index + 1]
          // Each segment runs from under this marker to the top of the next
          // one, which is 1.25rem below this row (0.5rem gap + 0.75rem marker
          // offset). The last one runs to the end pin instead: 0.5rem below on
          // phones (pin row is the pin's height), 1.125rem on desktop (3rem
          // row, 1.75rem pin centred). Everything is in rem, like the markers,
          // so the line stays centred when someone makes their text bigger.
          const reach = next ? '-bottom-5' : '-bottom-2 lg:-bottom-[1.125rem]'
          const walked = next ? next.revealed : found
          const draws = Boolean(next) && next.order === drawTo
          // The 2px line sits on the centre of the 1.5rem marker.
          const line = `absolute left-[calc(0.75rem-1px)] top-9 border-l-2 ${reach}`
          return (
            <li key={row.order} className="relative flex items-start gap-3">
              {/* Two layers: the dashed path ahead, and on top of it the solid
                  "walked" path, hidden by a clip until you reach the next stop.
                  When you tap to reveal that stop, the clip opens downward (250ms,
                  starting just after the hint appears), so the trail draws itself.
                  Any other segment just shows solid; with reduced motion it
                  switches instantly. */}
              <span aria-hidden="true" className={`${line} ${AHEAD}`} />
              <span
                aria-hidden="true"
                className={`${line} ${WALKED} ${
                  walked ? '[clip-path:inset(0)]' : '[clip-path:inset(0_0_100%_0)]'
                } ${draws ? 'motion-safe:transition-[clip-path] motion-safe:delay-100 motion-safe:duration-250 motion-safe:ease-out' : ''}`}
              />
              {/* mt-3 centres the marker on a 48px locked row, and on the first line of a revealed one. */}
              <span aria-hidden="true" className="relative mt-3 block shrink-0">
                <TrailMarker row={row} />
              </span>
              <HintRowFor row={row} onReveal={onReveal} className="min-w-0 flex-1" />
            </li>
          )
        })}
      </ol>
      {/* The end of the trail: the cache itself. */}
      <div className="flex h-7 items-center gap-3 lg:h-12">
        <span aria-hidden="true" className="flex w-6 shrink-0 justify-center">
          <MapPin found={found} />
        </span>
        <div className="hidden min-w-0 flex-1 lg:block">{action}</div>
      </div>
    </div>
  )
}

export default HintTrail
