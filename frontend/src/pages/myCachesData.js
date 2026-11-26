// Data helpers for the My caches page. Kept separate from the page so they
// can be tested without React.

// Never select secret_code here: this list doesn't need it.
// "finds(rating)" asks Supabase to also return each cache's finds (just the
// rating column), using the finds.cache_id foreign key.
const MY_CACHE_COLUMNS = 'id,title,location_name,is_active,created_at,finds(rating)'

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

// Builds the grey line under a cache title, e.g.
// "Back Bay Fens · 2 finds · Rated 4.0 on average".
// Find count and average are calculated from finds, not stored.
export function describeCacheStats(cache) {
  const finds = cache.finds ?? []
  const parts = []

  if (cache.location_name) {
    parts.push(cache.location_name)
  }

  if (finds.length === 0) {
    parts.push('No finds yet')
    return parts.join(' · ')
  }

  parts.push(finds.length === 1 ? '1 find' : `${finds.length} finds`)

  // Rating is optional on a find, so only average the ones that have one.
  const ratings = finds.map((find) => find.rating).filter((rating) => rating != null)
  if (ratings.length > 0) {
    const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
    parts.push(`Rated ${average.toFixed(1)} on average`)
  }

  return parts.join(' · ')
}
