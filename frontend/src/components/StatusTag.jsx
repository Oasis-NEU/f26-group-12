// "Active" or "Taken down" for one of your own caches, as a small pill
// (rounded-full, so it never reads as one of the 8px-cornered buttons near
// it). Active is outlined in ink; Taken down is the quieter Subtle fill.
// The word says it either way, not the colour. Used on My caches (each row)
// and Edit cache (next to the heading), so both always match.
//
// active: whether the cache is on the map.
function StatusTag({ active, className = '' }) {
  return active ? (
    <span
      className={`inline-flex shrink-0 rounded-full border border-border-strong bg-bg-surface px-2.5 py-0.5 text-tag text-text-primary ${className}`}
    >
      Active
    </span>
  ) : (
    <span
      className={`inline-flex shrink-0 rounded-full border border-transparent bg-bg-subtle px-2.5 py-0.5 text-tag text-text-secondary ${className}`}
    >
      Taken down
    </span>
  )
}

export default StatusTag
