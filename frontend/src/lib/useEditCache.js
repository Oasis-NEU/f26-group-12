import { useCallback, useEffect, useState } from 'react'
import { bringBackCache, loadCacheForEdit, saveCacheEdits, takeDownCache } from '../pages/editCacheData.js'
import { supabase } from './supabaseClient.js'

// Everything the Edit cache page loads and saves, in one hook:
//   - who's signed in (signed out, the page opens the login dialog)
//   - the cache, its hints and its secret code (the code only comes back
//     for the person who hid it; RLS hides it from everyone else)
// plus save(), takeDown() and bringBack(). The queries live in
// pages/editCacheData.js.
//
// The cache loads once we know who's signed in, and again if that changes,
// so after logging in from this page the code shows up too.

export function useEditCache(cacheId) {
  // undefined while checking, then the user's id, or null when signed out.
  const [userId, setUserId] = useState(undefined)
  const [attempt, setAttempt] = useState(0)
  // The last finished load, tagged with which cache, user and try it's for.
  const [result, setResult] = useState({ key: null, data: null, error: false })
  const key = `${cacheId}:${userId}:${attempt}`

  useEffect(() => {
    let active = true
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUserId(session?.user?.id ?? null)
    })
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setUserId(data.session?.user?.id ?? null)
      })
      .catch(() => {
        if (active) setUserId(null)
      })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!userId) return
    let active = true
    loadCacheForEdit(supabase, cacheId)
      .then((data) => {
        if (active) setResult({ key, data, error: false })
      })
      .catch(() => {
        if (active) setResult({ key, data: null, error: true })
      })
    return () => {
      active = false
    }
  }, [cacheId, userId, key])

  const retry = useCallback(() => setAttempt((count) => count + 1), [])
  const save = useCallback((values, hints) => saveCacheEdits(supabase, cacheId, values, hints), [cacheId])
  const takeDown = useCallback(() => takeDownCache(supabase, cacheId), [cacheId])
  const bringBack = useCallback(() => bringBackCache(supabase, cacheId), [cacheId])

  const current = result.key === key
  return {
    userId,
    loading: Boolean(userId) && !current,
    error: current && result.error,
    // { cache, hints } once loaded; null if there's no such cache (or it's
    // someone else's taken-down cache, which RLS hides).
    data: current ? result.data : null,
    retry,
    save,
    takeDown,
    bringBack,
  }
}
