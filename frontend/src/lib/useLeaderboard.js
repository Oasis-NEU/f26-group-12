import { useEffect, useState } from 'react'
import { LEADERBOARD_LIMIT, loadLeaderboard } from './leaderboard.js'
import { supabase } from './supabaseClient.js'

// Everything the Leaderboard page loads, in one hook:
//   - who's signed in (the board is public, but your own row is only marked
//     when you're logged in, so it reloads when that changes)
//   - the board itself, from the leaderboard database function (totals only,
//     never which caches anyone found, never secret codes)
//
// A "hook" is a function starting with "use" that a component calls to get
// state that updates over time.
//
// Returns { loading, error, rows, ownRowBelow, signedIn, limit, retry }.
// signedIn is undefined while checking, then true or false.

export function useLeaderboard() {
  // undefined while checking, then the user's id, or null when signed out.
  const [userId, setUserId] = useState(undefined)
  const [retryCount, setRetryCount] = useState(0)
  // Tagged with who it was loaded for (and which try), so a board loaded
  // for someone else, or an earlier try, is never shown.
  const [loaded, setLoaded] = useState({ key: null, rows: [], ownRowBelow: null, error: false })

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
      // If the session check fails, show the board as a signed-out visitor.
      .catch(() => {
        if (active) setUserId(null)
      })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const key = `${userId}:${retryCount}`

  // Load the board once we know who's looking (so "is_me" is right).
  useEffect(() => {
    if (userId === undefined) return
    // "active" stops a slow, out-of-date request from overwriting newer data.
    let active = true
    loadLeaderboard(supabase, LEADERBOARD_LIMIT)
      .then(({ rows, ownRowBelow }) => {
        if (active) setLoaded({ key, rows, ownRowBelow, error: false })
      })
      .catch(() => {
        if (active) setLoaded({ key, rows: [], ownRowBelow: null, error: true })
      })
    return () => {
      active = false
    }
  }, [userId, key])

  const current = loaded.key === key ? loaded : null

  return {
    loading: !current,
    error: current?.error ?? false,
    rows: current?.rows ?? [],
    ownRowBelow: current?.ownRowBelow ?? null,
    signedIn: userId === undefined ? undefined : Boolean(userId),
    limit: LEADERBOARD_LIMIT,
    retry: () => setRetryCount((count) => count + 1),
  }
}
