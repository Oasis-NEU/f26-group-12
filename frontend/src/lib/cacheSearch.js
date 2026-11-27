// The suggestions under the header search: caches whose name or place
// matches what's typed, and the places themselves ("Near Snell Library"),
// like a map app's search box. Matching works the same way as the map's
// list (mapData.js filterCaches): the text anywhere in the name or place,
// ignoring case.
//
// Street addresses aren't searched yet (that needs a geocoding service);
// see the map backlog.

// Only what the suggestions show. Never secret_code.
const SEARCH_COLUMNS = 'id,title,location_name'

// Every cache that's up (taken-down ones are hidden from finders anyway).
export async function loadSearchableCaches(supabase) {
  const { data, error } = await supabase
    .from('caches')
    .select(SEARCH_COLUMNS)
    .eq('is_active', true)
    .order('title', { ascending: true })
  if (error) throw error
  return data ?? []
}

// Hiders often type the place lowercase ("near Snell Library"), so show it
// with a capital first letter. The saved text isn't changed.
export function placeName(text) {
  const trimmed = (text ?? '').trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : ''
}

// How well text matches: 0 = starts with it, 1 = a word starts with it,
// 2 = contains it, null = no match.
function matchRank(text, query) {
  const lower = (text ?? '').toLowerCase()
  const at = lower.indexOf(query)
  if (at === -1) return null
  if (at === 0) return 0
  return /\s/.test(lower[at - 1]) ? 1 : 2
}

// The suggestions for what's typed:
//   caches: up to maxCaches { id, title, place }, best matches first (name
//     matches before place-only matches, then A to Z);
//   places: up to maxPlaces { name, count } whose name matches, the most
//     caches first;
//   total: how many caches match in all (for "See all N on the map").
export function searchSuggestions(caches, text, { maxCaches = 5, maxPlaces = 3 } = {}) {
  const query = text.trim().toLowerCase()
  if (!query) return { caches: [], places: [], total: 0 }

  const matches = []
  const places = new Map()
  for (const cache of caches) {
    const titleRank = matchRank(cache.title, query)
    const placeRank = matchRank(cache.location_name, query)
    if (titleRank === null && placeRank === null) continue
    // Name matches first (0-2), then place-only matches (3-5).
    matches.push({ cache, rank: titleRank ?? 3 + placeRank })
    if (placeRank !== null) {
      const name = placeName(cache.location_name)
      const key = name.toLowerCase()
      const entry = places.get(key) ?? { name, count: 0, rank: placeRank }
      entry.count += 1
      places.set(key, entry)
    }
  }

  matches.sort((a, b) => a.rank - b.rank || a.cache.title.localeCompare(b.cache.title))
  return {
    caches: matches.slice(0, maxCaches).map(({ cache }) => ({
      id: cache.id,
      title: cache.title,
      place: placeName(cache.location_name),
    })),
    places: [...places.values()]
      .sort((a, b) => a.rank - b.rank || b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, maxPlaces)
      .map(({ name, count }) => ({ name, count })),
    total: matches.length,
  }
}

// Splits text around the first place query appears, so the matching part
// can be shown in bold: [{ text, match }].
export function matchParts(text, query) {
  const trimmed = query.trim()
  const at = trimmed ? text.toLowerCase().indexOf(trimmed.toLowerCase()) : -1
  if (at === -1) return [{ text, match: false }]
  return [
    { text: text.slice(0, at), match: false },
    { text: text.slice(at, at + trimmed.length), match: true },
    { text: text.slice(at + trimmed.length), match: false },
  ].filter((part) => part.text)
}
