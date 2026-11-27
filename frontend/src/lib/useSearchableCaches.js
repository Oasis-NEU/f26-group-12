import { useEffect, useState } from 'react'
import { loadSearchableCaches } from './cacheSearch.js'
import { supabase } from './supabaseClient.js'

// The caches the header search suggests from (id, title and place only).
// They load the first time someone clicks into the search (not on every
// page), and are remembered for five minutes across pages, since every page
// draws its own header.
//
// Returns { caches, loading, failed }.

const FRESH_MS = 5 * 60 * 1000
const remembered = { caches: null, loadedAt: 0 }

export function useSearchableCaches(wanted) {
  // The last load this header started: { caches } or { error }.
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!wanted) return
    if (remembered.caches && Date.now() - remembered.loadedAt < FRESH_MS) return
    let active = true
    loadSearchableCaches(supabase)
      .then((caches) => {
        remembered.caches = caches
        remembered.loadedAt = Date.now()
        if (active) setResult({ caches })
      })
      .catch((error) => {
        if (active) setResult({ error })
      })
    return () => {
      active = false
    }
  }, [wanted])

  const caches = result?.caches ?? remembered.caches
  return {
    caches: caches ?? [],
    loading: wanted && !caches && !result?.error,
    failed: !caches && Boolean(result?.error),
  }
}
