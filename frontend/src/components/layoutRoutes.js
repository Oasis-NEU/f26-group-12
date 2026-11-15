export function isCacheDetailPath(pathname) {
  return pathname !== '/caches/new' && /^\/caches\/[^/]+$/.test(pathname)
}
