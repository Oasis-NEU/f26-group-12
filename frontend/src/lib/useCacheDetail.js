import { useEffect, useState } from 'react'
import { loadCacheDetails, loadHint, loadHintCount, loadUserFind } from '../pages/cacheDetailData.js'
import { supabase } from './supabaseClient.js'

// Everything the cache detail page loads, in one hook, so every version of
// the page shows the same data. The queries themselves live in
// pages/cacheDetailData.js (and never select secret_code); this hook only
// decides when to run them.
//
// A "hook" is a function starting with "use" that a component calls to get
// state that updates over time (here: loading, then the cache).

// Who is signed in. undefined = still checking, null = signed out.
function useUserId() {
  const [userId, setUserId] = useState(undefined)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
    })

    supabase.auth
      .getSession()
      .then(({ data }) => setUserId(data.session?.user?.id ?? null))
      .catch(() => setUserId(null))

    return () => subscription.unsubscribe()
  }, [])

  return userId
}

export function useCacheDetail(cacheId) {
  const userId = useUserId()
  const [retryCount, setRetryCount] = useState(0)
  // Each piece of loaded data is tagged with what it belongs to, so stale
  // results from a previous cache (or user) are ignored instead of shown.
  const [details, setDetails] = useState({ key: null, cache: null, hintCount: 0, hintCountError: false, error: false })
  const [findResult, setFindResult] = useState({ key: null, find: null })
  const [hints, setHints] = useState({ cacheId: null, revealed: {}, pendingOrder: null, error: '' })

  const detailsKey = `${cacheId}:${retryCount}`
  const loading = details.key !== detailsKey
  const findKey = `${cacheId}:${userId}`
  const find = findResult.key === findKey ? findResult.find : null
  const revealed = hints.cacheId === cacheId ? hints.revealed : {}

  // Load the cache, how many hints it has, and hint 1, all at the same time.
  // (Hint 1 used to wait for the count, which cost an extra round trip; on a
  // phone outdoors that's a noticeable wait. Asking for a hint that doesn't
  // exist just returns nothing.)
  useEffect(() => {
    let active = true
    const key = `${cacheId}:${retryCount}`

    Promise.all([
      loadCacheDetails(supabase, cacheId),
      // A failed count shouldn't hide the whole cache, so catch it separately.
      loadHintCount(supabase, cacheId).then(
        (count) => ({ count, failed: false }),
        () => ({ count: 0, failed: true }),
      ),
      // Same for hint 1.
      loadHint(supabase, cacheId, 1).then(
        (hint) => ({ hint, failed: false }),
        () => ({ hint: null, failed: true }),
      ),
    ])
      .then(([loadedCache, { count, failed }, firstHint]) => {
        if (!active) return
        setDetails({ key, cache: loadedCache, hintCount: count, hintCountError: failed, error: false })
        setHints((current) => {
          const base = current.cacheId === cacheId ? current.revealed : {}
          if (firstHint.failed && count > 0) {
            return { cacheId, revealed: base, pendingOrder: null, error: 'Hints couldn’t load right now.' }
          }
          const revealed = firstHint.hint ? { ...base, [firstHint.hint.hint_order]: firstHint.hint.hint_text } : base
          return { cacheId, revealed, pendingOrder: null, error: '' }
        })
      })
      .catch(() => {
        if (active) setDetails({ key, cache: null, hintCount: 0, hintCountError: false, error: true })
      })

    return () => {
      active = false
    }
  }, [cacheId, retryCount])

  // Has the signed-in user already found this cache?
  useEffect(() => {
    if (userId === undefined) return
    let active = true

    loadUserFind(supabase, cacheId, userId)
      .then((loadedFind) => {
        if (active) setFindResult({ key: `${cacheId}:${userId}`, find: loadedFind })
      })
      // If this fails we just show the normal "I found it" button.
      .catch(() => {})

    return () => {
      active = false
    }
  }, [cacheId, userId])

  // If they've already found it, reveal every hint. (Hint 1 loads with the
  // cache, above.)
  const hintCount = loading ? 0 : details.hintCount
  const revealAll = Boolean(find)
  useEffect(() => {
    if (hintCount === 0 || !revealAll) return
    let active = true
    const orders = Array.from({ length: hintCount }, (_, index) => index + 1)

    Promise.all(orders.map((order) => loadHint(supabase, cacheId, order)))
      .then((loaded) => {
        if (!active) return
        setHints((current) => {
          const base = current.cacheId === cacheId ? current.revealed : {}
          const next = { ...base }
          loaded.forEach((hint) => {
            if (hint) next[hint.hint_order] = hint.hint_text
          })
          return { cacheId, revealed: next, pendingOrder: null, error: '' }
        })
      })
      .catch(() => {
        if (active) setHints({ cacheId, revealed: {}, pendingOrder: null, error: 'Hints couldn’t load right now.' })
      })

    return () => {
      active = false
    }
  }, [cacheId, hintCount, revealAll])

  // Revealing only fetches that one hint, so later hints never reach the
  // browser until someone asks. Nothing is saved; a refresh starts over.
  async function revealHint(order) {
    setHints((current) => ({ ...current, cacheId, pendingOrder: order, error: '' }))
    try {
      const hint = await loadHint(supabase, cacheId, order)
      setHints((current) => ({
        cacheId,
        revealed: hint ? { ...current.revealed, [order]: hint.hint_text } : current.revealed,
        pendingOrder: null,
        error: hint ? '' : 'That hint isn’t available.',
      }))
    } catch {
      setHints((current) => ({ ...current, pendingOrder: null, error: 'That hint couldn’t load. Try again.' }))
    }
  }

  return {
    loading,
    error: details.error,
    cache: details.cache,
    hintCount: details.hintCount,
    hintCountError: details.hintCountError,
    revealed,
    pendingOrder: hints.cacheId === cacheId ? hints.pendingOrder : null,
    hintError: hints.cacheId === cacheId ? hints.error : '',
    find,
    revealHint,
    retry: () => setRetryCount((count) => count + 1),
  }
}
