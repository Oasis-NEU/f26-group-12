import { useEffect, useState } from 'react'
import { loadActiveCaches } from '../pages/mapData.js'
import { pickFeaturedCaches } from '../pages/landingData.js'
import { loadCacheRatings } from './cacheRatings.js'
import { supabase } from './supabaseClient.js'

// What the landing page loads: a few real caches to show newcomers, and
// their average ratings. It uses the map's own query (loadActiveCaches in
// pages/mapData.js), unchanged, so it never selects secret_code, then picks
// three (pickFeaturedCaches). Loaded once; the landing page doesn't need the
// map's 30-second refresh or live updates.
//
// A "hook" is a function starting with "use" that a component calls to get
// state that updates over time.
//
// Returns { status, caches, ratings }:
//   status   'loading', 'ready' or 'error'
//   caches   up to three active caches (empty while loading or on error)
//   ratings  { [cacheId]: { average, count } }, or null when the ratings
//            couldn't load (then the cards leave the rating out, as on the map)

export function useLandingCaches() {
  const [state, setState] = useState({ status: 'loading', caches: [], ratings: null })

  useEffect(() => {
    // "active" stops a request that finishes after the page has closed from
    // updating it.
    let active = true

    async function load() {
      try {
        const caches = pickFeaturedCaches(await loadActiveCaches(supabase))
        // Ratings only for the caches shown. If they fail, the caches still show.
        const ratings =
          caches.length > 0
            ? await loadCacheRatings(
                supabase,
                caches.map((cache) => cache.id),
              ).catch(() => null)
            : null
        if (active) setState({ status: 'ready', caches, ratings })
      } catch {
        if (active) setState({ status: 'error', caches: [], ratings: null })
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  return state
}
