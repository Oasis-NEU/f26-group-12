import { MAX_HINTS } from '../lib/hideCache.js'

// Data helpers for the Edit cache page. Kept separate from the page so they
// can be tested without React. useEditCache (src/lib) decides when to run
// them.

const EDIT_CACHE_COLUMNS =
  'id,title,description,location_name,difficulty,image,latitude,longitude,is_active,created_by'

export async function loadCacheForEdit(supabase, cacheId) {
  const { data: cache, error } = await supabase
    .from('caches')
    .select(EDIT_CACHE_COLUMNS)
    .eq('id', cacheId)
    .maybeSingle()

  if (error) {
    throw error
  }
  if (!cache) {
    return null
  }

  const { data: hints, error: hintsError } = await supabase
    .from('hints')
    .select('hint_order,hint_text')
    .eq('cache_id', cacheId)
    .order('hint_order', { ascending: true })

  if (hintsError) {
    throw hintsError
  }

  // The secret code lives in its own table. RLS only returns the row to the
  // person who hid the cache, so anyone else just gets null here. It is shown
  // read-only on the page and never sent back in an update.
  const { data: secret, error: secretError } = await supabase
    .from('cache_secrets')
    .select('secret_code')
    .eq('cache_id', cacheId)
    .maybeSingle()

  if (secretError) {
    throw secretError
  }

  return {
    cache: { ...cache, secret_code: secret?.secret_code ?? null },
    hints: (hints ?? []).map(({ hint_text: text }) => text),
  }
}

// Turns what's in the form into the row we save. Returns { errors } when
// something needs fixing, otherwise { values }.
export function prepareCacheEdits(form) {
  const errors = {}
  const title = form.title.trim()
  const difficulty = Number(form.difficulty)
  const { lat, lng } = form.position ?? {}

  if (!title) {
    errors.title = 'Give your cache a name.'
  }
  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
    errors.difficulty = 'Pick a difficulty from 1 to 5.'
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    errors.position = 'Place the pin on the map.'
  }

  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  return {
    values: {
      title,
      // Empty optional fields are saved as null, not "".
      description: form.description.trim() || null,
      location_name: form.locationName.trim() || null,
      difficulty,
      latitude: lat,
      longitude: lng,
    },
    // Blank hints are dropped and the rest renumbered 1, 2, 3 in order.
    hints: form.hints.map((hint) => hint.trim()).filter(Boolean).slice(0, MAX_HINTS),
  }
}

// A summary of what the form would save, for telling whether it has
// changed since it loaded. Extra spaces and blank hint fields don't count,
// so adding an empty hint box and leaving it isn't a change.
export function formSnapshot(form) {
  return JSON.stringify([
    form.title.trim(),
    form.description.trim(),
    form.locationName.trim(),
    Number(form.difficulty),
    form.position?.lat ?? null,
    form.position?.lng ?? null,
    form.hints.map((hint) => hint.trim()).filter(Boolean),
  ])
}

// Thrown when an update comes back with no rows changed. The database (RLS)
// doesn't send an error when it blocks an update: it just changes nothing,
// so without this the page would say "saved" when nothing was.
export class NothingSavedError extends Error {
  constructor() {
    super('Nothing was saved.')
    this.name = 'NothingSavedError'
  }
}

// Adds the time limit's signal (from an AbortController) to a request, so
// the page can stop waiting. Requests without one are left as they are.
function withSignal(request, signal) {
  return signal && request.abortSignal ? request.abortSignal(signal) : request
}

// Updates one caches row and checks it really changed. .select('id') asks
// for the changed row back (the owner can always read their own caches,
// even taken-down ones, so it comes back whenever the update worked).
async function updateCacheRow(supabase, cacheId, values, signal) {
  const { data, error } = await withSignal(
    supabase.from('caches').update(values).eq('id', cacheId).select('id'),
    signal,
  )
  if (error) {
    throw error
  }
  if (!data || data.length === 0) {
    throw new NothingSavedError()
  }
}

// Saves the form: the caches row first, then the hints.
//
// The hints are written one step at a time, using only what the database
// lets the hider do on the hints table: add a hint, remove a hint, and
// change a hint's text (not its cache). So instead of one "upsert", it:
//   1. reads which hint numbers (hint_order) the cache has now,
//   2. changes the text of the ones that are still there,
//   3. adds the new ones,
//   4. removes the ones past the new last hint.
//
// The cache row goes first, so if the person isn't allowed to change this
// cache it stops before touching any hint. These are separate requests, so
// they can't all succeed or fail together (that needs a database function,
// planned as an update_cache RPC on its own branch): if the signal drops
// halfway, some of it may have saved. Saving again is safe, because it
// writes the same thing and finishes the rest.
//
// signal (optional, from an AbortController) lets the page stop waiting
// after SAVE_TIMEOUT_MS (shared with Hide a cache, in lib/hideCache.js).
export async function saveCacheEdits(supabase, cacheId, values, hints, signal) {
  await updateCacheRow(supabase, cacheId, values, signal)

  // 1. The hint numbers already saved, e.g. [1, 2, 3].
  const { data: existingRows, error: readError } = await withSignal(
    supabase.from('hints').select('hint_order').eq('cache_id', cacheId),
    signal,
  )
  if (readError) {
    throw readError
  }
  const existing = new Set((existingRows ?? []).map((row) => row.hint_order))

  // 2 and 3. Hints are numbered 1, 2, 3 in order.
  const newRows = []
  for (const [index, hintText] of hints.entries()) {
    const hintOrder = index + 1
    if (!existing.has(hintOrder)) {
      newRows.push({ cache_id: cacheId, hint_order: hintOrder, hint_text: hintText })
      continue
    }
    const { data, error } = await withSignal(
      supabase
        .from('hints')
        .update({ hint_text: hintText })
        .eq('cache_id', cacheId)
        .eq('hint_order', hintOrder)
        .select('hint_order'),
      signal,
    )
    if (error) {
      throw error
    }
    if (!data || data.length === 0) {
      throw new NothingSavedError()
    }
  }

  if (newRows.length > 0) {
    const { error } = await withSignal(supabase.from('hints').insert(newRows), signal)
    if (error) {
      throw error
    }
  }

  // 4. Remove hints past the new last one (e.g. the person cleared hint 3).
  // Removing nothing is fine: most saves don't drop a hint.
  const { error: deleteError } = await withSignal(
    supabase.from('hints').delete().eq('cache_id', cacheId).gt('hint_order', hints.length),
    signal,
  )
  if (deleteError) {
    throw deleteError
  }
}

// What a failed save means for the page: signed-out, timeout or other
// (each with the message to show).
export function describeSaveError(error) {
  const message = String(error?.message ?? '')
  if (error?.code === 'PGRST301' || error?.status === 401 || /jwt/i.test(message)) {
    return { kind: 'signed-out', message: 'Your login ran out. Log in again, then save your changes.' }
  }
  if (error?.name === 'AbortError' || /abort/i.test(message)) {
    return {
      kind: 'timeout',
      message: 'That’s taking a while. Check your signal and try again. Saving again is safe.',
    }
  }
  if (error instanceof NothingSavedError) {
    return {
      kind: 'not-saved',
      message: 'Your changes didn’t save. Refresh the page to check you’re logged in as the person who hid this cache.',
    }
  }
  return { kind: 'other', message: 'Your changes didn’t save. Check your connection and try again.' }
}

// Caches are never deleted. Taking one down just hides it from the map.
export async function takeDownCache(supabase, cacheId) {
  await updateCacheRow(supabase, cacheId, { is_active: false })
}

// Puts a taken-down cache back on the map. The hider is allowed to change
// is_active on their own caches (the caches update policy), so this is the
// same one-column update as taking it down, the other way round.
export async function bringBackCache(supabase, cacheId) {
  await updateCacheRow(supabase, cacheId, { is_active: true })
}
