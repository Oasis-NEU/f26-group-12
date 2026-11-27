// Plain functions for the hints list, kept apart from React so they can be
// tested on their own.

// One entry per hint, in order, saying what each row should show.
// revealed: { 1: 'hint text', ... } for the hints loaded so far.
// pendingOrder: the hint currently being fetched, or null.
export function getHintRows(hintCount, revealed, pendingOrder) {
  // The lowest-numbered hint that hasn't been revealed yet.
  let nextOrder = 1
  while (revealed[nextOrder] !== undefined) nextOrder += 1

  return Array.from({ length: hintCount }, (_, index) => {
    const order = index + 1
    return {
      order,
      text: revealed[order],
      revealed: revealed[order] !== undefined,
      // Hints unlock in order: only the next one can be opened.
      canReveal: order === nextOrder,
      revealing: pendingOrder === order,
    }
  })
}

// "2 hints left", "1 hint left", "All hints revealed", or "" with no hints.
export function hintsLeftText(hintCount, revealedCount) {
  if (hintCount === 0) return ''
  const left = hintCount - revealedCount
  if (left <= 0) return 'All hints revealed'
  return left === 1 ? '1 hint left' : `${left} hints left`
}

// From remembered hint numbers, the ones to bring back: an unbroken run from
// hint 1 within the cache's hint count (hints unlock in order, so a gap or a
// hint that no longer exists ends the run). [2, 1, 4] with 3 hints -> [1, 2].
export function rememberedRun(orders, hintCount) {
  const sorted = [...new Set(orders)].filter((order) => order >= 1 && order <= hintCount).sort((a, b) => a - b)
  let reached = 0
  while (sorted[reached] === reached + 1) reached += 1
  return sorted.slice(0, reached)
}
