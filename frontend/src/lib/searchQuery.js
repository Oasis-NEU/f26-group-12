// The cache search lives in the address bar as ?q= (e.g. /map?q=snell), so
// the header's search box and the map read the same thing, a search survives
// a reload, and a search started on another page carries over to the map.

export const SEARCH_PARAM = 'q'

// The search in these URLSearchParams ('' when there's none).
export function readSearch(params) {
  return params.get(SEARCH_PARAM) ?? ''
}

// A copy of params with the search set to text (removed when it's empty), so
// other parts of the address are kept.
export function withSearch(params, text) {
  const next = new URLSearchParams(params)
  if (text) next.set(SEARCH_PARAM, text)
  else next.delete(SEARCH_PARAM)
  return next
}

// Where pressing Enter in the header search goes from another page: the map,
// showing what matches.
export function mapSearchPath(text) {
  const trimmed = text.trim()
  return trimmed ? `/map?${SEARCH_PARAM}=${encodeURIComponent(trimmed)}` : '/map'
}
