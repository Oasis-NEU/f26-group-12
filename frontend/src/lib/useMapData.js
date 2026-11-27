import { useEffect, useState } from 'react'
import { loadActiveCaches, loadUserFinds, subscribeToUserFindChanges } from '../pages/mapData.js'
import { loadCacheRatings } from './cacheRatings.js'
import { supabase } from './supabaseClient.js'

// Everything the map page loads, in one hook. This is the map page's data
// loading moved here unchanged: who's signed in, the active caches and which
// of them you've found (refreshed every 30 seconds), and a live update
// whenever one of your finds changes, plus every cache's average rating
// (cacheRatings.js). The queries themselves live in pages/mapData.js; none
// of them select secret_code.
//
// A "hook" is a function starting with "use" that a component calls to get
// state that updates over time.

const REFRESH_INTERVAL_MS = 30_000

export function useMapData() {
  const [caches, setCaches] = useState([])
  const [foundIds, setFoundIds] = useState([])
  // { [cacheId]: { average, count } }, or null when the ratings
  // couldn't load (e.g. the cache_ratings function isn't in the database
  // yet). Ratings failing never stops the map: the cards just leave them out.
  const [ratings, setRatings] = useState(null)
  const [userId, setUserId] = useState(null)
  const [cacheLoading, setCacheLoading] = useState(true)
  const [dataError, setDataError] = useState('')
  const [authError, setAuthError] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState('connecting')
  const [retryCount, setRetryCount] = useState(0)

  // Who is signed in (null = signed out), kept up to date as they log in or out.
  useEffect(() => {
    let active = true
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
    })

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          throw error
        }
        if (active) {
          setUserId(data.session?.user?.id ?? null)
          setAuthError(false)
        }
      })
      .catch(() => {
        if (active) {
          setUserId(null)
          setAuthError(true)
        }
      })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  // The caches and your finds: loaded now, every 30 seconds, and shortly
  // after any change to your finds.
  useEffect(() => {
    let active = true
    let refreshing = false
    let debounceTimer

    const refresh = async () => {
      if (refreshing) {
        return
      }

      refreshing = true
      try {
        const [nextCaches, nextFoundIds, nextRatings] = await Promise.all([
          loadActiveCaches(supabase),
          loadUserFinds(supabase, userId),
          loadCacheRatings(supabase).catch(() => null),
        ])

        if (active) {
          setCaches(nextCaches)
          setFoundIds(nextFoundIds)
          // A refresh that fails keeps the last ratings, so a weak signal
          // doesn't blank them all for 30 seconds.
          setRatings((current) => nextRatings ?? current)
          setDataError('')
        }
      } catch {
        if (active) {
          setDataError('The caches couldn’t load.')
        }
      } finally {
        refreshing = false
        if (active) {
          setCacheLoading(false)
        }
      }
    }

    const scheduleRefresh = () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        void refresh()
      }, 250)
    }

    const channel = subscribeToUserFindChanges(
      supabase,
      userId,
      scheduleRefresh,
      (status) => {
        if (!active) {
          return
        }
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('live')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRealtimeStatus('polling')
        }
      },
    )
    const intervalId = setInterval(() => {
      void refresh()
    }, REFRESH_INTERVAL_MS)

    void refresh()

    return () => {
      active = false
      clearTimeout(debounceTimer)
      clearInterval(intervalId)
      if (channel) {
        void supabase.removeChannel(channel)
      }
    }
  }, [userId, retryCount])

  return {
    caches,
    foundIds,
    ratings,
    userId,
    cacheLoading,
    dataError,
    authError,
    realtimeStatus,
    retry: () => setRetryCount((count) => count + 1),
  }
}
