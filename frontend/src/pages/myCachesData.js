// Data helpers for the My caches page. Kept separate from the page so they
// can be tested without React. useMyCaches (src/lib) decides when to run
// them.

// Never select secret_code here: this list doesn't need it.
//
// No finds or ratings for now: the finds table only lets people read their
// own finds (RLS), so embedding a cache's finds here always came back empty
// and every row said "No finds yet". A database function that returns just
// the totals (find count and average rating) is planned on its own branch;
// once it's in, the counts and stars can come back.
const MY_CACHE_COLUMNS = 'id,title,location_name,is_active,created_at'

export async function loadMyCaches(supabase, userId) {
  if (!userId) {
    return []
  }

  const { data, error } = await supabase
    .from('caches')
    .select(MY_CACHE_COLUMNS)
    .eq('created_by', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  // Active caches first, taken-down ones after. Within each group the newest
  // stays on top because sort keeps the order from the query.
  return [...(data ?? [])].sort((a, b) => Number(b.is_active) - Number(a.is_active))
}

// The grey line under a cache title: just its place for now (e.g. "Back
// Bay Fens"), or "" when it has none. Finds and ratings come back once the
// totals function exists (see MY_CACHE_COLUMNS above).
export function describeCacheStats(cache) {
  return cache.location_name?.trim() || ''
}

// The secret code for one cache, for printing its slip. Only loaded when the
// hider presses "Print slip", never with the list above. The code lives in
// its own table, cache_secrets, which RLS only lets the cache's creator read,
// so anyone else just gets no row (and this throws).
export async function loadSecretCode(supabase, cacheId) {
  const { data, error } = await supabase
    .from('cache_secrets')
    .select('secret_code')
    .eq('cache_id', cacheId)
    .maybeSingle()

  if (error) {
    throw error
  }
  if (!data?.secret_code) {
    throw new Error('No secret code for this cache.')
  }
  return data.secret_code
}
