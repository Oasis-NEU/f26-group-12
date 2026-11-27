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

// Gives up on a request after `ms`, so a stalled request on a weak phone
// signal can't leave a hint stuck on "Revealing…" forever.
const HINT_TIMEOUT_MS = 10000
function withTimeout(promise, ms) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

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
  // Hint 1, loaded early but kept locked until someone taps it, so the
  // first reveal is instant without giving the hint away.
  const [firstHint, setFirstHint] = useState({ cacheId: null, hint: null })
  // The hint someone most recently tapped to reveal, so only the trail
  // segment leading to it draws itself (nothing animates on page load).
  const [lastTapped, setLastTapped] = useState({ cacheId: null, order: null })

  const detailsKey = `${cacheId}:${retryCount}`
  const loading = details.key !== detailsKey
  const findKey = `${cacheId}:${userId}`
  const find = findResult.key === findKey ? findResult.find : null
  // Still finding out whether this person has found it (or who they are).
  // The page waits on this so "I found it" doesn't flash before "Found by you".
  const findChecking = userId === undefined || findResult.key !== findKey
  // The signed-in person hid this cache. They know its code.
  const isHider = Boolean(userId && details.cache?.created_by && details.cache.created_by === userId)
  const revealed = hints.cacheId === cacheId ? hints.revealed : {}

  // Load the cache, how many hints it has, and hint 1, all at the same time.
  // Hint 1 stays locked (every hint starts locked); it's loaded now so that
  // revealing it doesn't wait on a slow phone connection. Asking for a hint
  // that doesn't exist just returns nothing.
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
      .then(([loadedCache, { count, failed }, first]) => {
        if (!active) return
        setDetails({ key, cache: loadedCache, hintCount: count, hintCountError: failed, error: false })
        // If this early load failed, revealing hint 1 just fetches it then.
        setFirstHint({ cacheId, hint: first.hint })
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
      // If this fails we just show the normal "I found it" button (rather
      // than waiting forever).
      .catch(() => {
        if (active) setFindResult({ key: `${cacheId}:${userId}`, find: null })
      })

    return () => {
      active = false
    }
  }, [cacheId, userId])

  // If they've already found it, or hid it themselves, reveal every hint.
  const hintCount = loading ? 0 : details.hintCount
  const revealAll = Boolean(find) || isHider
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
    setLastTapped({ cacheId, order })
    // Hint 1 is usually already here (loaded with the cache): show it now.
    if (order === 1 && firstHint.cacheId === cacheId && firstHint.hint) {
      const text = firstHint.hint.hint_text
      setHints((current) => ({
        cacheId,
        revealed: { ...(current.cacheId === cacheId ? current.revealed : {}), 1: text },
        pendingOrder: null,
        error: '',
      }))
      return
    }
    setHints((current) => ({ ...current, cacheId, pendingOrder: order, error: '' }))
    try {
      const hint = await withTimeout(loadHint(supabase, cacheId, order), HINT_TIMEOUT_MS)
      setHints((current) => ({
        cacheId,
        revealed: hint ? { ...current.revealed, [order]: hint.hint_text } : current.revealed,
        pendingOrder: null,
        error: hint ? '' : 'That hint isn’t available.',
      }))
    } catch (error) {
      // Focus goes back to the hint's button (HintRow), so trying again is one tap.
      const message =
        error?.message === 'timeout'
          ? 'That hint is taking too long. Check your signal and try again.'
          : 'That hint couldn’t load. Try again.'
      setHints((current) => ({ ...current, pendingOrder: null, error: message }))
    }
  }

  return {
    loading,
    error: details.error,
    cache: details.cache,
    // True when the signed-in person hid this cache. They know its code, so
    // the page doesn't offer them "I found it".
    isHider,
    findChecking,
    lastTappedOrder: lastTapped.cacheId === cacheId ? lastTapped.order : null,
    // undefined while checking, then true or false. Logging a find needs an
    // account, so the page tells signed-out visitors before they try.
    signedIn: userId === undefined ? undefined : Boolean(userId),
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
