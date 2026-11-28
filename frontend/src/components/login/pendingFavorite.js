// The favourite someone asked for before logging in. Pressing a heart while
// logged out opens the login dialog; once they've logged in, the dialog
// calls requestFavorite(cacheId, heartId), and that cache's heart adds it
// as soon as their favourites have loaded (so the list arriving can't undo
// it).
//
// It's a tiny store outside React, because the heart that asked may not be
// the one that finishes it (the page can re-draw its hearts after logging
// in), and a page can show the same cache more than once (a card in the
// list, the map's popup, the phone card), some of them hidden. The heart
// that was tapped (heartId, its useId) gets it if it's still there;
// otherwise the first heart for that cache that's on screen (see
// FavoriteButton). takePendingFavorite hands it to exactly one of them.
//
// It only waits a short while (PENDING_MS) once the favourites have loaded:
// if no heart for that cache takes it by then, it's dropped, so a cache
// never turns into a favourite later out of the blue. While a heart for it
// is still loading the favourites (a slow signal outdoors), the clock waits
// too (restartPendingClock). Nothing here is saved anywhere: it's gone on a
// reload.

export const PENDING_MS = 15000

let pendingId = null
let pendingHeart = null
let requestedAt = 0
const listeners = new Set()

function notify() {
  for (const listener of listeners) listener()
}

export function requestFavorite(cacheId, heartId = null, now = Date.now()) {
  pendingId = cacheId ?? null
  pendingHeart = heartId
  requestedAt = now
  notify()
}

export function getPendingFavorite() {
  return pendingId
}

// Whether heartId is the heart that asked for the pending favourite.
export function isPendingHeart(cacheId, heartId) {
  return pendingId !== null && pendingId === cacheId && pendingHeart === heartId
}

// For useSyncExternalStore-style listening: call listener whenever the
// pending one changes.
export function subscribePendingFavorite(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// A heart for cacheId has just stopped waiting for the favourites to load:
// the 15 seconds start again from now.
export function restartPendingClock(cacheId, now = Date.now()) {
  if (pendingId !== null && pendingId === cacheId) requestedAt = now
}

// True (and clears it) if cacheId is the favourite waiting to be added.
// Only the first heart to ask gets true. One that waited too long is
// dropped instead.
export function takePendingFavorite(cacheId, now = Date.now()) {
  if (pendingId === null || pendingId !== cacheId) return false
  const fresh = now - requestedAt <= PENDING_MS
  pendingId = null
  pendingHeart = null
  notify()
  return fresh
}

export function clearPendingFavorite() {
  if (pendingId === null) return
  pendingId = null
  pendingHeart = null
  notify()
}
