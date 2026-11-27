// Caches' average ratings, from the cache_ratings database function
// (supabase/changes/2026-11-27_cache-ratings-tighten.sql). It returns the
// average and the number of ratings only, never who rated what or how many
// found it, so finds stay private.

// { [cacheId]: { average, count } }. average is null when nobody has rated
// it. Pass ids for just those caches, or leave them out for all.
export async function loadCacheRatings(supabase, cacheIds) {
  const { data, error } = await supabase.rpc('cache_ratings', cacheIds ? { p_cache_ids: cacheIds } : {})
  if (error) throw error
  const ratings = {}
  for (const row of data ?? []) {
    const average = row.average_rating === null ? null : Number(row.average_rating)
    ratings[row.cache_id] = {
      average: Number.isFinite(average) ? average : null,
      count: Number(row.rating_count) || 0,
    }
  }
  return ratings
}

// What screen readers hear for a rating, e.g. "Rated 4.6 out of 5 from 12
// ratings", or "No ratings yet".
export function ratingLabel(rating) {
  if (!rating?.count || rating.average === null) return 'No ratings yet'
  const from = rating.count === 1 ? '1 rating' : `${rating.count} ratings`
  return `Rated ${rating.average.toFixed(1)} out of 5 from ${from}`
}
