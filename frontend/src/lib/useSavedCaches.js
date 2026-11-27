import { useEffect, useRef, useState } from 'react'
import { loadSavedIds, saveCache, unsaveCache } from './savedCaches.js'
import { supabase } from './supabaseClient.js'

// The signed-in person's favourite caches (stored in the saved_caches
// table), for the heart buttons and the map's "Favorites" filter.
//
// toggle(cacheId, source) flips a favourite straight away (so the heart
// responds instantly), then saves it. Taps while that cache's request is
// still out don't start a second one: the latest tap is remembered and
// sent next, so quick double taps can't finish in the wrong order. If
// saving fails, the heart flips back and `error` says so for 4 seconds,
// tagged with `source` (the button that was tapped) so only that one shows
// the note.
//
// Returns { savedIds, loaded, loadError, reload, error, toggle, isSaved }.
// The hearts wait (not pressable) until loaded, so a tap can't be undone by
// the list arriving afterwards.

const NONE = []
const ERROR_MS = 4000

export function useSavedCaches(userId) {
  // Tagged with whose favourites they are, so another user's never show.
  const [state, setState] = useState({ userId: null, ids: NONE, loaded: false, loadError: false })
  const [error, setError] = useState(null)
  const [reloads, setReloads] = useState(0)
  // cacheId -> the state its in-flight request should end in.
  const pending = useRef(new Map())

  useEffect(() => {
    if (!userId) return
    let active = true
    loadSavedIds(supabase, userId)
      .then((ids) => {
        if (active) setState({ userId, ids, loaded: true, loadError: false })
      })
      // If it fails, the hearts still work, but the Favorites view says it
      // couldn't load them (and offers to try again).
      .catch(() => {
        if (active) setState({ userId, ids: NONE, loaded: true, loadError: true })
      })
    return () => {
      active = false
    }
  }, [userId, reloads])

  // The failure note goes after 4 seconds.
  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(null), ERROR_MS)
    return () => clearTimeout(timer)
  }, [error])

  const mine = Boolean(userId) && state.userId === userId
  const savedIds = mine ? state.ids : NONE

  function setSaved(cacheId, isSaved) {
    setState((current) => {
      if (current.userId !== userId) return current
      const without = current.ids.filter((id) => id !== cacheId)
      return { ...current, ids: isSaved ? [...without, cacheId] : without }
    })
  }

  // Sends cacheId's latest wanted state, then any newer one asked for while
  // it was out.
  async function sync(cacheId, source) {
    let wanted
    try {
      do {
        wanted = pending.current.get(cacheId)
        if (wanted) await saveCache(supabase, cacheId)
        else await unsaveCache(supabase, cacheId)
      } while (pending.current.get(cacheId) !== wanted)
      pending.current.delete(cacheId)
    } catch {
      pending.current.delete(cacheId)
      // Back to how it was before this change, and say so.
      setSaved(cacheId, !wanted)
      setError({
        cacheId,
        source,
        message: wanted ? 'Couldn’t add it to your favorites. Try again.' : 'Couldn’t remove it from your favorites. Try again.',
      })
    }
  }

  function toggle(cacheId, source) {
    const want = !savedIds.includes(cacheId)
    setError(null)
    setSaved(cacheId, want)
    const inFlight = pending.current.has(cacheId)
    pending.current.set(cacheId, want)
    if (!inFlight) sync(cacheId, source)
  }

  return {
    savedIds,
    loaded: mine && state.loaded,
    loadError: mine && state.loadError,
    reload: () => setReloads((count) => count + 1),
    error,
    toggle,
    isSaved: (cacheId) => savedIds.includes(cacheId),
  }
}
