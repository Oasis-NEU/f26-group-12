import { useEffect, useState } from 'react'
import { loadSavedIds, saveCache, unsaveCache } from './savedCaches.js'
import { supabase } from './supabaseClient.js'

// The signed-in person's saved caches, for the bookmark buttons and the
// map's "Saved" filter.
//
// toggle(cacheId) flips a save straight away (so the bookmark responds
// instantly), then saves or unsaves in the database; if that fails, it
// flips back and sets `error` for the button to say so.
//
// Returns { savedIds (array), loaded, error, toggle, isSaved(id) }.

export function useSavedCaches(userId) {
  // Tagged with whose saves they are, so a different user's never show.
  const [state, setState] = useState({ userId: null, ids: [], loaded: false })
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) return
    let active = true
    loadSavedIds(supabase, userId)
      .then((ids) => {
        if (active) setState({ userId, ids, loaded: true })
      })
      // If it fails, everything shows as not saved; saving still works.
      .catch(() => {
        if (active) setState({ userId, ids: [], loaded: true })
      })
    return () => {
      active = false
    }
  }, [userId])

  const savedIds = state.userId === userId && userId ? state.ids : []

  function setIds(change) {
    setState((current) => ({ ...current, userId, ids: change(current.userId === userId ? current.ids : []) }))
  }

  async function toggle(cacheId) {
    const wasSaved = savedIds.includes(cacheId)
    setError(null)
    setIds((ids) => (wasSaved ? ids.filter((id) => id !== cacheId) : [...ids, cacheId]))
    try {
      if (wasSaved) await unsaveCache(supabase, cacheId)
      else await saveCache(supabase, cacheId)
    } catch {
      // Put it back the way it was, and say so.
      setIds((ids) => (wasSaved ? [...ids, cacheId] : ids.filter((id) => id !== cacheId)))
      setError({ cacheId, message: wasSaved ? 'Couldn’t remove it. Try again.' : 'Couldn’t save it. Try again.' })
    }
  }

  return {
    savedIds,
    loaded: state.userId === userId && state.loaded,
    error,
    toggle,
    isSaved: (cacheId) => savedIds.includes(cacheId),
  }
}
