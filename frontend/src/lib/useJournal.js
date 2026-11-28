import { useEffect, useState } from 'react'
import { loadCacheRatings } from './cacheRatings.js'
import { loadFavoriteCaches, loadJournalFinds, saveFindNote, saveFindRating } from './journal.js'
import { supabase } from './supabaseClient.js'

// Everything the Journal page loads, in one hook:
//   - who's signed in (the page sends signed-out people to log in)
//   - your finds, newest first, with each cache's public details
//   - the caches you favorited, and their average ratings (for the cards)
// plus rateFind() and saveNote(), which save a rating or a journal note on
// one of your finds.
// The queries live in journal.js; none of them select secret_code.
//
// A "hook" is a function starting with "use" that a component calls to get
// state that updates over time.

export function useJournal() {
  // undefined while checking, then the user's id, or null when signed out.
  const [userId, setUserId] = useState(undefined)
  const [findsTry, setFindsTry] = useState(0)
  const [favoritesTry, setFavoritesTry] = useState(0)
  // Each result is tagged with what it belongs to (whose, which try), so a
  // slow answer for another user or an earlier try is never shown.
  const [findsResult, setFindsResult] = useState({ key: null, items: [], error: false })
  const [favoritesResult, setFavoritesResult] = useState({ key: null, items: [], ratings: null, error: false })

  // Who is signed in, kept up to date as they log in or out.
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
      // If the check fails, treat them as signed out instead of loading forever.
      .catch(() => {
        if (active) setUserId(null)
      })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const findsKey = `${userId}:${findsTry}`
  const favoritesKey = `${userId}:${favoritesTry}`

  // Your finds, once we know who you are.
  useEffect(() => {
    if (!userId) return
    let active = true
    loadJournalFinds(supabase, userId)
      .then((items) => {
        if (active) setFindsResult({ key: findsKey, items, error: false })
      })
      .catch(() => {
        if (active) setFindsResult({ key: findsKey, items: [], error: true })
      })
    return () => {
      active = false
    }
  }, [userId, findsKey])

  // Your favorites and their average ratings. Ratings failing never stops
  // the list: the cards just leave the rating out (ratings: null).
  useEffect(() => {
    if (!userId) return
    let active = true
    loadFavoriteCaches(supabase, userId)
      .then(async (items) => {
        const ids = items.map((cache) => cache.id)
        const ratings = ids.length ? await loadCacheRatings(supabase, ids).catch(() => null) : {}
        if (active) setFavoritesResult({ key: favoritesKey, items, ratings, error: false })
      })
      .catch(() => {
        if (active) setFavoritesResult({ key: favoritesKey, items: [], ratings: null, error: true })
      })
    return () => {
      active = false
    }
  }, [userId, favoritesKey])

  const finds = findsResult.key === findsKey ? findsResult : null
  const favorites = favoritesResult.key === favoritesKey ? favoritesResult : null

  // Shows a saved change to one find in the list.
  function updateFind(findId, changes) {
    setFindsResult((current) => ({
      ...current,
      items: current.items.map((find) => (find.id === findId ? { ...find, ...changes } : find)),
    }))
  }

  // Save a rating or a note on one of your finds, then show it in the list.
  // They throw if it didn't save, so the page can say so.
  async function rateFind(findId, rating) {
    updateFind(findId, { rating: await saveFindRating(supabase, { findId, rating }) })
  }
  async function saveNote(findId, note) {
    updateFind(findId, { note: await saveFindNote(supabase, { findId, note }) })
  }


  return {
    userId,
    finds: {
      loading: userId === undefined || (Boolean(userId) && !finds),
      error: finds?.error ?? false,
      items: finds?.items ?? [],
      retry: () => setFindsTry((count) => count + 1),
    },
    favorites: {
      loading: userId === undefined || (Boolean(userId) && !favorites),
      error: favorites?.error ?? false,
      items: favorites?.items ?? [],
      // { [cacheId]: { average, count } }, or null if they couldn't load.
      ratings: favorites?.ratings ?? null,
      retry: () => setFavoritesTry((count) => count + 1),
    },
    rateFind,
    saveNote,
  }
}
