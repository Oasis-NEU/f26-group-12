import { useEffect, useState } from 'react'
import { loadCacheDetails, loadHint, loadHintCount, loadUserFind } from '../pages/cacheDetailData.js'
import { rememberedRun } from '../pages/cacheDetail/hintRows.js'
import { loadCacheRatings } from './cacheRatings.js'
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

// Which hints this person has revealed on a cache, remembered for this
// browser tab only (sessionStorage: it stays on the phone, holds no
// location, and is gone when the tab closes). It means hints survive the
// tab reloading, e.g. when iOS reloads it on the way back from Google Maps.
// If storage is blocked (some private modes), hints just aren't remembered.
const rememberKey = (cacheId) => `huskycache:revealed-hints:${cacheId}`
function readRemembered(cacheId) {
  try {
    const orders = JSON.parse(window.sessionStorage.getItem(rememberKey(cacheId)) ?? '[]')
    return Array.isArray(orders) ? orders.filter(Number.isInteger) : []
  } catch {
    return []
  }
}
function remember(cacheId, order) {
  try {
    const orders = new Set(readRemembered(cacheId))
    orders.add(order)
    window.sessionStorage.setItem(rememberKey(cacheId), JSON.stringify([...orders]))
  } catch {
    // Storage blocked: just don't remember.
  }
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
  // Hints loaded ahead of time but still locked on screen: hint 1 with the
  // cache, then the next one after each reveal. Tapping one shows it
  // instantly instead of waiting on a slow phone connection.
  const [prefetched, setPrefetched] = useState({ cacheId: null, hints: {} })
  // The hint someone most recently tapped to reveal, so only the trail
  // segment leading to it draws itself (nothing animates on page load).
  const [lastTapped, setLastTapped] = useState({ cacheId: null, order: null })
  // The cache's average rating: { average, count }, or undefined when it
  // couldn't load (e.g. cache_ratings isn't in the database yet), so the page
  // leaves it out rather than saying "No ratings yet" wrongly.
  const [ratingResult, setRatingResult] = useState({ cacheId: null, rating: undefined })

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
        setPrefetched({ cacheId, hints: first.hint ? { 1: first.hint } : {} })
      })
      .catch(() => {
        if (active) setDetails({ key, cache: null, hintCount: 0, hintCountError: false, error: true })
      })

    return () => {
      active = false
    }
  }, [cacheId, retryCount])

  // Its average rating (totals only; see cacheRatings.js). A cache with no
  // row has no ratings yet. Failing doesn't affect the rest of the page.
  useEffect(() => {
    let active = true
    loadCacheRatings(supabase, [cacheId])
      .then((ratings) => {
        if (active) setRatingResult({ cacheId, rating: ratings[cacheId] ?? { average: null, count: 0 } })
      })
      .catch(() => {
        if (active) setRatingResult({ cacheId, rating: undefined })
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

  // Load one hint quietly and keep it locked, ready for an instant reveal.
  function preload(id, order) {
    loadHint(supabase, id, order).then(
      (hint) => {
        if (!hint) return
        setPrefetched((current) =>
          current.cacheId === id ? { cacheId: id, hints: { ...current.hints, [order]: hint } } : current,
        )
      },
      // If it fails, tapping the hint just fetches it then.
      () => {},
    )
  }

  // Bring back the hints this person already revealed here (this tab only),
  // then preload the next one. Hints unlock in order, so only an unbroken
  // run from hint 1 counts.
  useEffect(() => {
    if (hintCount === 0 || revealAll) return
    const run = rememberedRun(readRemembered(cacheId), hintCount)
    const reached = run.length
    if (reached === 0) return
    let active = true

    Promise.all(run.map((order) => loadHint(supabase, cacheId, order))).then(
      (loaded) => {
        if (!active) return
        setHints((current) => {
          const base = current.cacheId === cacheId ? current.revealed : {}
          const next = { ...base }
          loaded.forEach((hint) => {
            if (hint) next[hint.hint_order] = hint.hint_text
          })
          return { cacheId, revealed: next, pendingOrder: null, error: '' }
        })
        if (reached + 1 <= hintCount) preload(cacheId, reached + 1)
      },
      // If bringing them back fails, the hints just stay locked.
      () => {},
    )

    return () => {
      active = false
    }
    // preload only uses setState, which never changes, so it isn't a dependency.
  }, [cacheId, hintCount, revealAll])
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

  // After a reveal: remember it (this tab only) and preload the next hint.
  // Only the next one is loaded early, so hints further ahead still don't
  // reach the browser until someone gets there.
  function afterReveal(order) {
    remember(cacheId, order)
    if (order + 1 <= details.hintCount) preload(cacheId, order + 1)
  }

  async function revealHint(order) {
    setLastTapped({ cacheId, order })
    // Usually the hint is already here (preloaded): show it now.
    const ready = prefetched.cacheId === cacheId ? prefetched.hints[order] : undefined
    if (ready) {
      setHints((current) => ({
        cacheId,
        revealed: { ...(current.cacheId === cacheId ? current.revealed : {}), [order]: ready.hint_text },
        pendingOrder: null,
        error: '',
      }))
      afterReveal(order)
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
      if (hint) afterReveal(order)
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
    // Who's signed in (undefined while checking, null when signed out),
    // for the save button.
    userId,
    hintCount: details.hintCount,
    hintCountError: details.hintCountError,
    revealed,
    pendingOrder: hints.cacheId === cacheId ? hints.pendingOrder : null,
    hintError: hints.cacheId === cacheId ? hints.error : '',
    find,
    rating: ratingResult.cacheId === cacheId ? ratingResult.rating : undefined,
    revealHint,
    retry: () => setRetryCount((count) => count + 1),
  }
}
