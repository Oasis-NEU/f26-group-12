// Logging a find: sending the secret code (with an optional rating and
// journal note) to the log_find database function, and turning its answers
// into what the page shows. Each function takes the Supabase client, so
// tests can pass in a fake one.
//
// The page never sees the real code: log_find checks it inside the
// database (supabase/changes/2026-11-15_secret-codes-and-policies.sql) and
// only says whether it matched.

export const NOTE_MAX_LENGTH = 500
// Secret codes are 6 characters from this alphabet: no 0, O, 1, I or L, so
// nothing on the slip can be misread (see generate_secret_code in the SQL).
export const CODE_LENGTH = 6
const CODE_ALPHABET = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/
// Give up waiting for log_find after this long (weak signal at the cache).
export const LOG_TIMEOUT_MS = 15000

// How people type codes off a slip: "qdr mx4" -> "QDRMX4". (log_find also
// trims and upper-cases, so this only keeps what's sent tidy.)
export function normalizeSecretCode(value) {
  return value.replace(/\s+/g, '').toUpperCase()
}

// '' when the code could be right, or the message to show under the field.
// Catching these here saves a trip to the database on a weak signal.
export function checkSecretCode(value) {
  const code = normalizeSecretCode(value)
  if (!code) return 'Enter the code from the slip.'
  if (/[0O1IL]/.test(code)) return 'Codes never use 0, O, 1, I or L. Check the slip again.'
  if (!CODE_ALPHABET.test(code)) return 'Codes are only letters and numbers. Check the slip again.'
  if (code.length !== CODE_LENGTH) {
    return `Slip codes have ${CODE_LENGTH} characters. You’ve typed ${code.length}.`
  }
  return ''
}

// Sends the find. rating is 1-5 or null; note can be ''. signal (from an
// AbortController) lets the page give up after LOG_TIMEOUT_MS. Returns the
// new find's id.
export async function logFind(supabase, { cacheId, code, rating, note, signal }) {
  let request = supabase.rpc('log_find', {
    p_cache_id: cacheId,
    p_secret_code: normalizeSecretCode(code),
    p_rating: rating || null,
    p_journal_note: note.trim() || null,
  })
  if (signal && request.abortSignal) request = request.abortSignal(signal)
  const { data, error } = await request
  if (error) throw error
  return data
}

// What someone typed, kept for this browser tab only (sessionStorage: it
// stays on this device and is gone when the tab closes) when their login
// runs out mid-form, so it's still there when they come back from logging
// in. If storage is blocked, it just isn't kept.
const draftKey = (cacheId) => `huskycache:log-find-draft:${cacheId}`
export function saveDraft(cacheId, draft) {
  try {
    window.sessionStorage.setItem(draftKey(cacheId), JSON.stringify(draft))
  } catch {
    // Storage blocked: nothing kept.
  }
}
export function readDraft(cacheId) {
  try {
    const draft = JSON.parse(window.sessionStorage.getItem(draftKey(cacheId)) ?? 'null')
    if (!draft || typeof draft !== 'object') return null
    return {
      code: typeof draft.code === 'string' ? draft.code : '',
      rating: Number.isInteger(draft.rating) && draft.rating >= 1 && draft.rating <= 5 ? draft.rating : 0,
      note: typeof draft.note === 'string' ? draft.note.slice(0, NOTE_MAX_LENGTH) : '',
    }
  } catch {
    return null
  }
}
export function clearDraft(cacheId) {
  try {
    window.sessionStorage.removeItem(draftKey(cacheId))
  } catch {
    // Storage blocked: nothing to clear.
  }
}

// What a log_find error means for the page:
//   wrong-code     the code didn't match (shown under the code field)
//   already-found  this person has logged it before
//   hider          they hid this cache
//   inactive       the cache was taken down
//   signed-out     their login ran out
//   timeout        no answer within LOG_TIMEOUT_MS (the page gave up)
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
  if (error?.name === 'AbortError' || /abort/i.test(message)) {
    return { kind: 'timeout', message: 'That’s taking too long. Check your signal and try again.' }
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
