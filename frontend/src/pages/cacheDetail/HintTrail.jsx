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
function HintTrail({ rows, onReveal, found, action }) {
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
          const segment = next
            ? `-bottom-5 ${next.revealed ? WALKED : AHEAD}`
            : `-bottom-2 lg:-bottom-[1.125rem] ${found ? WALKED : AHEAD}`
          return (
            <li key={row.order} className="relative flex items-start gap-3">
              {/* The 2px line sits on the centre of the 1.5rem marker. */}
              <span aria-hidden="true" className={`absolute left-[calc(0.75rem-1px)] top-9 border-l-2 ${segment}`} />
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
