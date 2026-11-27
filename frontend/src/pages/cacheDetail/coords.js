// The cache's coordinates as { lat, lng }, or null if they're missing or out
// of range. Used by the mini map and the "Get directions" link, so both agree
// on what counts as a real location.
export function cacheCoordinates(cache) {
  // Number(null) and Number('') are 0, which would put a cache with no
  // location at 0°, 0° (in the ocean), so treat empty values as missing.
  if ([cache.latitude, cache.longitude].some((value) => value === null || value === undefined || value === '')) {
    return null
  }
  const lat = Number(cache.latitude)
  const lng = Number(cache.longitude)
  const valid = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  return valid ? { lat, lng } : null
}
