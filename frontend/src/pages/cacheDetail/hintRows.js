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
