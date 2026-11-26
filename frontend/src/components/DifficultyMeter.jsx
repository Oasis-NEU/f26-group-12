// Five bars plus "Difficulty N", from the Figma "DifficultyMeter" component.
//
// Figma variants -> props:
//   Level: 1-5  -> level={3}
//   Show label  -> showLabel (on by default)
//
// Difficulty is always bars (ratings are always stars, see StarRating).
// Keep the label on wherever people decide whether to try a cache. With
// showLabel={false} the text is still there for screen readers.
//
// `difficulty` is the older name for `level`; the map and cache detail pages
// still use it, so both work.

function DifficultyMeter({ level, difficulty, showLabel = true, className = '' }) {
  // Keep it between 1 and 5 even if the data is missing or out of range.
  const value = Math.min(5, Math.max(1, Math.round(Number(level ?? difficulty)) || 1))
  const label = `Difficulty ${value}`

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="flex items-center gap-[3px]" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((bar) => (
          <span
            key={bar}
            // Empty bars darken with Increase Contrast on (contrast-more:), so
            // the level still reads in bright light.
            className={`h-[14px] w-[7px] ${bar <= value ? 'bg-text-primary' : 'bg-border-subtle contrast-more:bg-border-input'}`}
          />
        ))}
      </span>
      <span className={showLabel ? 'whitespace-nowrap text-label text-text-primary' : 'sr-only'}>
        {label}
      </span>
    </span>
  )
}

export default DifficultyMeter
