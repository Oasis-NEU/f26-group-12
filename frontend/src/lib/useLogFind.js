import { useEffect, useState } from 'react'
import { loadAccountSummary } from '../components/accountData.js'
import { loadCacheDetails, loadUserFind } from '../pages/cacheDetailData.js'
import { supabase } from './supabaseClient.js'

// Everything the "Log a find" page loads, in one hook, reusing the queries
// the cache page and the account menu already use (none of them select
// secret_code):
//   - who's signed in (the page sends signed-out people to log in)
//   - the cache (its name, difficulty, whether it's still active, its hider)
//   - whether this person has already logged it
// plus loadPoints(), their points total after a find (for "You now have N
// points").
//
// A "hook" is a function starting with "use" that a component calls to get
// state that updates over time.

export function useLogFind(cacheId) {
  // undefined while checking, then the user's id, or null when signed out.
  const [userId, setUserId] = useState(undefined)
  const [retryCount, setRetryCount] = useState(0)
  // Tagged with what it belongs to, so a result for another cache or user
  // (or an earlier try) is never shown.
  const [loaded, setLoaded] = useState({ key: null, cache: null, find: null, error: false })

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

  const key = `${cacheId}:${userId}:${retryCount}`

  // Load the cache and this person's find of it, once we know who they are.
  useEffect(() => {
    if (!userId) return
    let active = true
    Promise.all([loadCacheDetails(supabase, cacheId), loadUserFind(supabase, cacheId, userId)])
      .then(([cache, find]) => {
        if (active) setLoaded({ key, cache, find, error: false })
      })
      .catch(() => {
        if (active) setLoaded({ key, cache: null, find: null, error: true })
      })
    return () => {
      active = false
    }
  }, [cacheId, userId, key])

  const current = loaded.key === key ? loaded : null

  return {
    userId,
    loading: userId === undefined || (Boolean(userId) && !current),
    error: current?.error ?? false,
    cache: current?.cache ?? null,
    existingFind: current?.find ?? null,
    isHider: Boolean(userId && current?.cache?.created_by === userId),
    retry: () => setRetryCount((count) => count + 1),
    // Their points after logging (the sum of the difficulty of every cache
    // they've found). null if it couldn't load; the page just leaves it out.
    loadPoints: () =>
      loadAccountSummary(supabase, userId).then(
        (summary) => summary.points,
        () => null,
      ),
  }
}
