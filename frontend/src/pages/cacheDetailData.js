// created_by is the hider's account id, so the page can tell a hider they
// can't log their own cache. latitude/longitude feed the "Get directions"
// link. (Never secret_code.)
const CACHE_DETAIL_COLUMNS = 'id,title,description,location_name,difficulty,image,is_active,created_by,latitude,longitude'

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

// The signed-in user's find of this cache, as { created_at }, or null if they
// haven't found it (or aren't signed in). created_at is shown as
// "Found by you on Oct 30".
export async function loadUserFind(supabase, cacheId, userId) {
  if (!userId) {
    return null
  }

  const { data, error } = await supabase
    .from('finds')
    .select('created_at')
    .eq('finder_id', userId)
    .eq('cache_id', cacheId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

// "2026-10-30T15:00:00Z" -> "Oct 30" (in the viewer's time zone).
export function formatFoundDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// How many hints the cache has, without downloading any hint text, so locked
// hints stay hidden until someone asks for them.
export async function loadHintCount(supabase, cacheId) {
  const { count, error } = await supabase
    .from('hints')
    .select('hint_order', { count: 'exact', head: true })
    .eq('cache_id', cacheId)

  if (error) {
    throw error
  }

  return count ?? 0
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
