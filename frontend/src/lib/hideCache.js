// Hiding a cache: making its secret code, checking the form, and saving it
// with the create_cache database function, which stores the cache, its
// hints and its code together (supabase/changes/2026-11-15_secret-codes-
// and-policies.sql). Each function takes what it needs as arguments, so
// tests can pass in fakes.
//
// The code is shown only to the person hiding the cache (here, before and
// right after saving). Nothing on this page reads codes from the database.

// Secret codes: 6 characters from this alphabet. No 0, O, 1, I or L, so
// nothing on the slip can be misread (the same alphabet as the database's
// generate_secret_code).
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CODE_LENGTH = 6
export const MAX_HINTS = 3
export const TITLE_MAX_LENGTH = 80
export const DESCRIPTION_MAX_LENGTH = 500
export const LOCATION_MAX_LENGTH = 80
export const HINT_MAX_LENGTH = 200
// Give up waiting for create_cache after this long (weak signal).
export const SAVE_TIMEOUT_MS = 20000

// What each difficulty means, shown under the picker once one is chosen
// (and read out with each option).
export const DIFFICULTY_MEANINGS = {
  1: 'Easy to spot',
  2: 'A quick look around',
  3: 'Takes some searching',
  4: 'Well hidden',
  5: 'A real challenge',
}

// A new random code. Uses the browser's cryptographic random numbers
// (crypto.getRandomValues), so codes can't be guessed from the time or a
// pattern. getRandom is only passed in by tests.
export function generateSecretCode(getRandom = (array) => crypto.getRandomValues(array)) {
  const values = getRandom(new Uint32Array(CODE_LENGTH))
  return Array.from(values, (value) => CODE_ALPHABET[value % CODE_ALPHABET.length]).join('')
}

// Checks the form. Returns { field: message } for every problem (empty
// when it's ready to save). Fields: title, position, difficulty.
export function checkCacheForm({ title, position, difficulty }) {
  const problems = {}
  if (!title.trim()) problems.title = 'Give your cache a name.'
  if (!position) problems.position = 'Place the pin on the map, or use your current location.'
  if (!difficulty) problems.difficulty = 'Pick a difficulty.'
  return problems
}

// Saves the cache. Returns { cacheId, secretCode }. signal (from an
// AbortController) lets the page stop waiting after SAVE_TIMEOUT_MS.
export async function createCache(supabase, values, signal) {
  const { title, description, locationName, position, difficulty, hints, secretCode } = values
  let request = supabase.rpc('create_cache', {
    p_title: title.trim(),
    p_latitude: position.lat,
    p_longitude: position.lng,
    p_difficulty: difficulty,
    p_description: description.trim() || null,
    p_location_name: locationName.trim() || null,
    p_hints: hints.map((hint) => hint.trim()).filter(Boolean),
    p_secret_code: secretCode,
  })
  if (signal && request.abortSignal) request = request.abortSignal(signal)
  const { data, error } = await request
  if (error) throw error
  return { cacheId: data.cache_id, secretCode: data.secret_code }
}

// What a create_cache error means for the page: signed-out, timeout,
// network or other (each with the message to show).
export function describeCreateError(error) {
  const message = String(error?.message ?? '')
  if (/logged in/i.test(message) || error?.code === 'PGRST301' || error?.status === 401) {
    return { kind: 'signed-out', message: 'Your login ran out. Log in again to hide this cache.' }
  }
  if (error?.name === 'AbortError' || /abort/i.test(message)) {
    // It may still have saved, so don't invite a second, duplicate cache.
    return {
      kind: 'timeout',
      message: 'That’s taking a while. If your signal dropped, check My caches before trying again, so it isn’t hidden twice.',
    }
  }
  if (error?.status === 0 || error instanceof TypeError || /failed to fetch|network/i.test(message)) {
    return { kind: 'network', message: 'HuskyCache couldn’t be reached. Check your connection and try again.' }
  }
  return { kind: 'other', message: 'That didn’t save. Try again in a moment.' }
}

// The form so far, kept for this browser tab only (sessionStorage: it
// stays on this device and is gone when the tab closes), so a reload or a
// trip to log in doesn't lose it, and the code doesn't change after it's
// been written down. If storage is blocked, it just isn't kept.
const DRAFT_KEY = 'huskycache:hide-cache-draft'
export function saveDraft(draft) {
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // Storage blocked: nothing kept.
  }
}
export function readDraft() {
  try {
    const draft = JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) ?? 'null')
    if (!draft || typeof draft !== 'object') return null
    const text = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '')
    const position =
      Number.isFinite(draft.position?.lat) && Number.isFinite(draft.position?.lng)
        ? { lat: draft.position.lat, lng: draft.position.lng }
        : null
    const code = typeof draft.secretCode === 'string' ? draft.secretCode : ''
    const validCode = code.length === CODE_LENGTH && [...code].every((char) => CODE_ALPHABET.includes(char))
    return {
      title: text(draft.title, TITLE_MAX_LENGTH),
      description: text(draft.description, DESCRIPTION_MAX_LENGTH),
      locationName: text(draft.locationName, LOCATION_MAX_LENGTH),
      position,
      difficulty: Number.isInteger(draft.difficulty) && draft.difficulty >= 1 && draft.difficulty <= 5 ? draft.difficulty : null,
      hints: Array.isArray(draft.hints)
        ? draft.hints.slice(0, MAX_HINTS).map((hint) => text(hint, HINT_MAX_LENGTH))
        : [''],
      secretCode: validCode ? code : null,
    }
  } catch {
    return null
  }
}
export function clearDraft() {
  try {
    window.sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    // Storage blocked: nothing to clear.
  }
}

// The cache that was just hidden ({ cacheId, secretCode, title }), kept for
// this tab, so "Cache hidden!" (and its code) comes back after a reload or
// if the phone drops the tab while the hider copies the code. Cleared by
// "Hide another cache".
const HIDDEN_KEY = 'huskycache:hide-cache-done'
export function saveHidden(hidden) {
  try {
    window.sessionStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden))
  } catch {
    // Storage blocked: nothing kept.
  }
}
export function readHidden() {
  try {
    const hidden = JSON.parse(window.sessionStorage.getItem(HIDDEN_KEY) ?? 'null')
    const valid =
      hidden &&
      typeof hidden.cacheId === 'string' &&
      typeof hidden.title === 'string' &&
      typeof hidden.secretCode === 'string' &&
      hidden.secretCode.length === CODE_LENGTH
    return valid ? { cacheId: hidden.cacheId, secretCode: hidden.secretCode, title: hidden.title } : null
  } catch {
    return null
  }
}
export function clearHidden() {
  try {
    window.sessionStorage.removeItem(HIDDEN_KEY)
  } catch {
    // Storage blocked: nothing to clear.
  }
}
