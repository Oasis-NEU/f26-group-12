// Data helpers for the Edit cache page. Kept separate from the page so they
// can be tested without React.

export const MAX_HINTS = 3

// secret_code is included on purpose: only the person who hid the cache
// reaches this page, and they need the code to check their slip. It is shown
// read-only and never sent back in an update.
const EDIT_CACHE_COLUMNS =
  'id,title,description,location_name,difficulty,image,latitude,longitude,is_active,secret_code,created_by'

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

  return { cache, hints: (hints ?? []).map(({ hint_text: text }) => text) }
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

export async function saveCacheEdits(supabase, cacheId, values, hints) {
  const { error } = await supabase.from('caches').update(values).eq('id', cacheId)
  if (error) {
    throw error
  }

  // Upsert = insert, or update if a hint with that order already exists
  // (the one_hint_per_order constraint is on cache_id + hint_order).
  if (hints.length > 0) {
    const rows = hints.map((hintText, index) => ({
      cache_id: cacheId,
      hint_order: index + 1,
      hint_text: hintText,
    }))
    const { error: upsertError } = await supabase
      .from('hints')
      .upsert(rows, { onConflict: 'cache_id,hint_order' })
    if (upsertError) {
      throw upsertError
    }
  }

  // Remove hints past the new last one (e.g. the person cleared hint 3).
  const { error: deleteError } = await supabase
    .from('hints')
    .delete()
    .eq('cache_id', cacheId)
    .gt('hint_order', hints.length)
  if (deleteError) {
    throw deleteError
  }
}

// Caches are never deleted. Taking one down just hides it from the map.
export async function takeDownCache(supabase, cacheId) {
  const { error } = await supabase.from('caches').update({ is_active: false }).eq('id', cacheId)
  if (error) {
    throw error
  }
}
