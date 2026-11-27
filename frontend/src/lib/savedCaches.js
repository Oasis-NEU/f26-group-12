// Favorites: caches someone marks with the heart (they stay after a find).
// Stored in the saved_caches table (supabase/changes/2026-11-27_saved-
// caches.sql), where each person can only see and change their own. The
// app only ever sends a cache_id: user_id fills itself in.

// The ids of the caches this person saved ([] when signed out).
export async function loadSavedIds(supabase, userId) {
  if (!userId) return []
  const { data, error } = await supabase.from('saved_caches').select('cache_id').eq('user_id', userId)
  if (error) throw error
  return (data ?? []).map((row) => row.cache_id)
}

// Saves a cache. Saving one that's already saved counts as done.
export async function saveCache(supabase, cacheId) {
  const { error } = await supabase.from('saved_caches').insert({ cache_id: cacheId })
  // 23505: the one_save_per_person rule (it was saved already, e.g. in
  // another tab).
  if (error && error.code !== '23505') throw error
}

// Unsaves a cache (only this person's save; RLS sees to that).
export async function unsaveCache(supabase, cacheId) {
  const { error } = await supabase.from('saved_caches').delete().eq('cache_id', cacheId)
  if (error) throw error
}
