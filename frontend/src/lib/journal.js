// Data for the Journal page (/journal): your finds, your favorites, and
// saving a rating on a find you haven't rated yet. Each function takes the
// Supabase client, so tests can pass in a fake one.
//
// Nothing here selects secret_code (it lives in cache_secrets, which this
// file never touches). Each query asks only for the columns the page shows.

// Your finds, with the found cache's public details. "caches(...)" pulls in
// the cache through the finds.cache_id foreign key. Finders can't read a
// cache once it's taken down (only its hider can), so for those finds
// `caches` comes back as null; the page handles that.
const FIND_COLUMNS = 'id,created_at,rating,journal_note,photo,caches(id,title,location_name,difficulty,image,is_active)'

// The caches you favorited, newest favorite first.
const FAVORITE_COLUMNS = 'created_at,caches(id,title,location_name,difficulty,image,is_active)'

// Your finds, newest first ([] when signed out). Only your own rows come
// back: the database's rules (RLS) hide everyone else's finds.
export async function loadJournalFinds(supabase, userId) {
  if (!userId) return []
  const { data, error } = await supabase
    .from('finds')
    .select(FIND_COLUMNS)
    .eq('finder_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    foundAt: row.created_at,
    rating: row.rating ?? null,
    note: row.journal_note ?? '',
    photo: row.photo ?? null,
    // null when the cache was taken down (see FIND_COLUMNS).
    cache: row.caches ?? null,
  }))
}

// The caches you favorited, as cache rows, newest favorite first ([] when
// signed out). Taken-down caches are left out: they can't be opened or
// hunted, and finders can't read them anyway (they come back as null).
export async function loadFavoriteCaches(supabase, userId) {
  if (!userId) return []
  const { data, error } = await supabase
    .from('saved_caches')
    .select(FAVORITE_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => row.caches).filter((cache) => cache && cache.is_active)
}

// Saves a rating (1-5) on one of your finds. Finders may change rating,
// journal_note and photo on their own finds (schema.sql), and only the
// rating is sent, so the journal note is never touched. select() asks for
// the updated row back: if nothing came back, nothing was saved (e.g. the
// login ran out), so that counts as a failure rather than a silent no-op.
export async function saveFindRating(supabase, { findId, rating }) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('A rating is 1 to 5 stars.')
  }
  const { data, error } = await supabase.from('finds').update({ rating }).eq('id', findId).select('id,rating')
  if (error) throw error
  if (!data || data.length === 0) throw new Error('That rating didn’t save.')
  return data[0].rating
}

// Points and caches found, worked out from your finds (they're calculated,
// never stored). A find earns its cache's difficulty (PROJECT_CONTEXT.md).
// A taken-down cache can't be read, so its points can't be counted; the
// account menu works the same way, so the two always agree.
export function journalTotals(finds) {
  const points = finds.reduce((total, find) => total + (Number(find.cache?.difficulty) || 0), 0)
  return { points, found: finds.length }
}

// "2026-10-30T15:00:00Z" -> "Found Oct 30" this year, or "Found Oct 30,
// 2025" for an older find, so the year shows once it's needed (in the
// viewer's time zone). now is for tests.
export function foundDateText(timestamp, now = new Date()) {
  const date = new Date(timestamp)
  const sameYear = date.getFullYear() === now.getFullYear()
  const options = sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' }
  return `Found ${date.toLocaleDateString('en-US', options)}`
}

// The words under each number in the summary: "1 point" / "4 points", and
// "1 cache found" / "3 caches found".
export function pointsLabel(points) {
  return points === 1 ? 'point' : 'points'
}
export function foundLabel(count) {
  return count === 1 ? 'cache found' : 'caches found'
}
