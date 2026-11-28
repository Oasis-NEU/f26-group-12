// Which caches the landing page shows under "Waiting to be found".
//
// It gets the same list as the map (loadActiveCaches in mapData.js: active
// caches only, newest first, never secret_code) and takes the newest few,
// whether or not they have a photo. (Photos don't jump the queue: a cache's
// photo comes from whoever hid it, so it isn't picked out for the landing
// page.)

export const FEATURED_COUNT = 3

export function pickFeaturedCaches(caches, count = FEATURED_COUNT) {
  return (caches ?? []).slice(0, count)
}
