export function isCacheDetailPath(pathname) {
  return pathname !== '/caches/new' && /^\/caches\/[^/]+$/.test(pathname)
}

export function isCacheEditPath(pathname) {
  return /^\/caches\/[^/]+\/edit$/.test(pathname)
}
