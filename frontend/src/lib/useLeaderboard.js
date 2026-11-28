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
// Returns { loading, error, timedOut, rows, ownRowBelow, signedIn, retry }.
// signedIn is undefined while checking, then true or false. timedOut is
// true when the error was no answer within 15 seconds (a weak signal),
// rather than the database saying no.

export function useLeaderboard() {
  // undefined while checking, then the user's id, or null when signed out.
  const [userId, setUserId] = useState(undefined)
  const [retryCount, setRetryCount] = useState(0)
  // Tagged with who it was loaded for (and which try), so a board loaded
  // for someone else, or an earlier try, is never shown.
  const [loaded, setLoaded] = useState({ key: null, rows: [], ownRowBelow: null, error: null })

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
        if (active) setLoaded({ key, rows, ownRowBelow, error: null })
      })
      // error: 'timeout' (no answer in time) or 'failed' (anything else).
      .catch((error) => {
        const kind = error?.message === 'timeout' ? 'timeout' : 'failed'
        if (active) setLoaded({ key, rows: [], ownRowBelow: null, error: kind })
      })
    return () => {
      active = false
    }
  }, [userId, key])

  const current = loaded.key === key ? loaded : null

  return {
    loading: !current,
    error: Boolean(current?.error),
    timedOut: current?.error === 'timeout',
    rows: current?.rows ?? [],
    ownRowBelow: current?.ownRowBelow ?? null,
    signedIn: userId === undefined ? undefined : Boolean(userId),
    retry: () => setRetryCount((count) => count + 1),
  }
}
