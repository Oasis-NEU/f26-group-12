// Which caches the landing page shows under "Waiting to be found".
//
// It gets the same list as the map (loadActiveCaches in mapData.js: active
// caches only, newest first, never secret_code) and picks a few of them.
// Caches with a photo come first, since a photo shows a newcomer what a
// cache spot looks like; within each group the newest stay first.

export const FEATURED_COUNT = 3

export function pickFeaturedCaches(caches, count = FEATURED_COUNT) {
  const list = caches ?? []
  const withPhoto = list.filter((cache) => Boolean(cache.image))
  const withoutPhoto = list.filter((cache) => !cache.image)
  return [...withPhoto, ...withoutPhoto].slice(0, count)
}
