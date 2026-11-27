// image: the cache's photo, for its card in the list. Never secret_code.
const CACHE_COLUMNS = 'id,title,latitude,longitude,location_name,difficulty,image'

export async function loadActiveCaches(supabase) {
  const { data, error } = await supabase
    .from('caches')
    .select(CACHE_COLUMNS)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function loadUserFinds(supabase, userId) {
  if (!userId) {
    return []
  }

  const { data, error } = await supabase
    .from('finds')
    .select('cache_id')
    .eq('finder_id', userId)

  if (error) {
    throw error
  }

  return (data ?? []).map(({ cache_id: cacheId }) => cacheId)
}

export function subscribeToUserFindChanges(supabase, userId, onChange, onStatus) {
  if (!userId) {
    return null
  }

  return supabase
    .channel(`map-live-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'finds',
        filter: `finder_id=eq.${userId}`,
      },
      onChange,
    )
    .subscribe(onStatus)
}

export function filterCaches(caches, query, filter, foundIds) {
  const search = query.trim().toLowerCase()

  return caches.filter((cache) => {
    const isFound = foundIds.includes(cache.id)
    const matchesFilter =
      filter === 'to-find' ? !isFound : filter === 'my-finds' ? isFound : true
    const searchableText = `${cache.title} ${cache.location_name ?? ''}`.toLowerCase()

    return matchesFilter && (!search || searchableText.includes(search))
  })
}
