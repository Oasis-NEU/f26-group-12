// The favourite someone asked for before logging in. Pressing a heart while
// logged out opens the login dialog; once they've logged in, the dialog
// calls requestFavorite(cacheId), and that cache's heart adds it as soon as
// their favourites have loaded (so the list arriving can't undo it).
//
// It's a tiny store outside React, because the heart that asked may not be
// the one that finishes it (the page re-draws its hearts after logging in),
// and a page can show the same cache twice (a card and the map's popup).
// takePendingFavorite hands it to exactly one of them.
//
// It only waits a short while (PENDING_MS): if no heart for that cache shows
// up soon after logging in, it's dropped, so a cache never turns into a
// favourite later out of the blue. Nothing here is saved anywhere: it's
// gone on a reload.

export const PENDING_MS = 15000

let pendingId = null
let requestedAt = 0
const listeners = new Set()

function notify() {
  for (const listener of listeners) listener()
}

export function requestFavorite(cacheId, now = Date.now()) {
  pendingId = cacheId ?? null
  requestedAt = now
  notify()
}

export function getPendingFavorite() {
  return pendingId
}

// For useSyncExternalStore: call listener whenever the pending one changes.
export function subscribePendingFavorite(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// True (and clears it) if cacheId is the favourite waiting to be added.
// Only the first heart to ask gets true. One that waited too long is
// dropped instead.
export function takePendingFavorite(cacheId, now = Date.now()) {
  if (pendingId === null || pendingId !== cacheId) return false
  const fresh = now - requestedAt <= PENDING_MS
  pendingId = null
  notify()
  return fresh
}

export function clearPendingFavorite() {
  if (pendingId === null) return
  pendingId = null
  notify()
}
