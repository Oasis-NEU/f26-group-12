// Logging a find: sending the secret code (with an optional rating and
// journal note) to the log_find database function, and turning its answers
// into what the page shows. Each function takes the Supabase client, so
// tests can pass in a fake one.
//
// The page never sees the real code: log_find checks it inside the
// database (supabase/changes/2026-11-15_secret-codes-and-policies.sql) and
// only says whether it matched.

export const NOTE_MAX_LENGTH = 500

// How people type codes off a slip: "qdr mx4" -> "QDRMX4". (log_find also
// trims and upper-cases, so this only keeps what's sent tidy.)
export function normalizeSecretCode(value) {
  return value.replace(/\s+/g, '').toUpperCase()
}

// '' when there's a code to send, or the message to show under the field.
export function checkSecretCode(value) {
  return normalizeSecretCode(value) ? '' : 'Enter the code from the slip.'
}

// Sends the find. rating is 1-5 or null; note can be ''. Returns the new
// find's id.
export async function logFind(supabase, { cacheId, code, rating, note }) {
  const { data, error } = await supabase.rpc('log_find', {
    p_cache_id: cacheId,
    p_secret_code: normalizeSecretCode(code),
    p_rating: rating || null,
    p_journal_note: note.trim() || null,
  })
  if (error) throw error
  return data
}

// What a log_find error means for the page:
//   wrong-code     the code didn't match (shown under the code field)
//   already-found  this person has logged it before
//   hider          they hid this cache
//   inactive       the cache was taken down
//   signed-out     their login ran out
//   network        no answer at all
//   other          anything else
// log_find raises plain messages, so they're matched by their wording.
export function describeLogFindError(error) {
  const message = String(error?.message ?? '')
  if (/doesn.t match/i.test(message)) {
    return { kind: 'wrong-code', message: 'That code doesn’t match. Check the slip inside the cache and try again.' }
  }
  if (/already logged/i.test(message)) {
    return { kind: 'already-found', message: 'You’ve already logged this cache!' }
  }
  if (/you hid this cache/i.test(message)) {
    return { kind: 'hider', message: 'You hid this cache, so you can’t log it as a find.' }
  }
  if (/isn.t active/i.test(message)) {
    return { kind: 'inactive', message: 'This cache has been taken down, so it can’t be logged anymore.' }
  }
  if (/logged in/i.test(message) || error?.code === 'PGRST301' || error?.status === 401) {
    return { kind: 'signed-out', message: 'Your login ran out. Log in again to log this find.' }
  }
  if (error?.status === 0 || error instanceof TypeError || /failed to fetch|network/i.test(message)) {
    return { kind: 'network', message: 'HuskyCache couldn’t be reached. Check your connection and try again.' }
  }
  return { kind: 'other', message: 'That didn’t save. Try again in a moment.' }
}

// "+4 points": a find earns its cache's difficulty (PROJECT_CONTEXT.md).
export function pointsText(points) {
  return points === 1 ? '+1 point' : `+${points} points`
}
