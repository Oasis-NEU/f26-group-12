// The keyboard focus ring every component uses: a 2px blue ring with a 2px
// gap around it (ring-offset-2). focus-visible means it only shows for
// keyboard users, not on mouse clicks.
//
// outline-hidden removes the browser's own outline but keeps an invisible
// one, so Windows High Contrast mode (which hides rings) still shows focus.
export const FOCUS_RING =
  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2'
