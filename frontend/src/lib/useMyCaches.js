import { useCallback, useEffect, useState } from 'react'
import { loadMyCaches, loadSecretCode } from '../pages/myCachesData.js'
import { supabase } from './supabaseClient.js'

// Everything the My caches page loads, in one hook:
//   - who's signed in (signed out, the page opens the login dialog)
//   - the caches they've hidden, active first, each with its finds' ratings
// plus secretCode(cacheId), which loads one cache's code only when they
// press "Print slip". The list itself never selects secret_code; the
// queries live in pages/myCachesData.js.
//
// A "hook" is a function starting with "use" that a component calls to get
// state that updates over time.

export function useMyCaches() {
  // undefined while checking, then the user's id, or null when signed out.
  const [userId, setUserId] = useState(undefined)
  // Bumped by retry(), so the list loads again.
  const [attempt, setAttempt] = useState(0)
  // The last finished load, tagged with whose caches it holds and which try
  // it was. If that isn't the current one yet, we're still loading.
  const [result, setResult] = useState({ key: null, caches: [], error: false })
  const key = `${userId}:${attempt}`

  // Find out who is signed in, and keep listening in case that changes.
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
      // If the session check fails, treat them as signed out instead of loading forever.
      .catch(() => {
        if (active) setUserId(null)
      })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  // Load this user's caches whenever the signed-in user changes (or on retry).
  useEffect(() => {
    if (!userId) return
    // "active" stops a slow, out-of-date request from overwriting newer data.
    let active = true
    loadMyCaches(supabase, userId)
      .then((caches) => {
        if (active) setResult({ key, caches, error: false })
      })
      .catch(() => {
        if (active) setResult({ key, caches: [], error: true })
      })
    return () => {
      active = false
    }
  }, [userId, key])

  const retry = useCallback(() => setAttempt((count) => count + 1), [])
  const secretCode = useCallback((cacheId) => loadSecretCode(supabase, cacheId), [])

  return {
    userId,
    loading: Boolean(userId) && result.key !== key,
    error: result.key === key && result.error,
    caches: result.key === key ? result.caches : [],
    retry,
    secretCode,
  }
}
