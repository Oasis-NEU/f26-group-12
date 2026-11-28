import { NOTE_MAX_LENGTH } from './logFind.js'

// Data for the Journal page (/journal): your finds, your favorites, and
// saving a rating or a journal note on one of your finds. Each function
// takes the Supabase client, so tests can pass in a fake one.
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

// The error code for "the database saved nothing": the update ran but
// changed no row. That happens when the login ran out (the rules, RLS, then
// see nobody's finds), so the page asks them to log in again.
export const NOT_SAVED = 'not-saved'

// Changes one column on one of your finds and returns its new value.
// Finders may change rating, journal_note and photo on their own finds
// (schema.sql), and only the one column is sent, so the others are never
// touched. select() asks for the updated row back: if nothing came back,
// nothing was saved, so that's a failure rather than a silent no-op.
async function updateOwnFind(supabase, findId, column, value) {
  const { data, error } = await supabase
    .from('finds')
    .update({ [column]: value })
    .eq('id', findId)
    .select(`id,${column}`)
  if (error) throw error
  if (!data || data.length === 0) {
    throw Object.assign(new Error('Nothing was saved.'), { code: NOT_SAVED })
  }
  return data[0][column]
}

// Saves a rating (1-5) on one of your finds; the note isn't touched.
export async function saveFindRating(supabase, { findId, rating }) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('A rating is 1 to 5 stars.')
  }
  return updateOwnFind(supabase, findId, 'rating', rating)
}

// Saves the journal note on one of your finds; the rating isn't touched.
// Spaces at the ends are trimmed, and an empty note is saved as no note.
// Returns the saved note ('' for none). The limit is the same as on the
// Log a find page (NOTE_MAX_LENGTH in logFind.js).
export async function saveFindNote(supabase, { findId, note }) {
  const text = note.trim()
  if (text.length > NOTE_MAX_LENGTH) {
    throw new Error(`Notes can be up to ${NOTE_MAX_LENGTH} characters.`)
  }
  return (await updateOwnFind(supabase, findId, 'journal_note', text || null)) ?? ''
}

// What to say when a rating or note (what: 'rating' or 'note') didn't save:
//   needsLogin  the login ran out (nothing saved, or the database said so):
//               the page links to Log in, which comes back to the journal
//   otherwise   most likely the connection
export function describeFindSaveError(error, what) {
  const loggedOut =
    error?.code === NOT_SAVED || error?.code === 'PGRST301' || error?.status === 401 || /jwt/i.test(String(error?.message ?? ''))
  if (loggedOut) return { needsLogin: true, message: `Log in again to save your ${what}.` }
  return { needsLogin: false, message: `Your ${what} didn’t save. Check your connection and try again.` }
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
