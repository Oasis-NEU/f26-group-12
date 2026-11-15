const CACHE_DETAIL_COLUMNS = 'id,title,description,location_name,difficulty,image,is_active'

export async function loadCacheDetails(supabase, cacheId) {
  const { data, error } = await supabase
    .from('caches')
    .select(CACHE_DETAIL_COLUMNS)
    .eq('id', cacheId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function loadUserFindStatus(supabase, cacheId, userId) {
  if (!userId) {
    return false
  }

  const { data, error } = await supabase
    .from('finds')
    .select('cache_id')
    .eq('finder_id', userId)
    .eq('cache_id', cacheId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data)
}

export async function loadHint(supabase, cacheId, hintOrder) {
  const { data, error } = await supabase
    .from('hints')
    .select('hint_order,hint_text')
    .eq('cache_id', cacheId)
    .eq('hint_order', hintOrder)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}
