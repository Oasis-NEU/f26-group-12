import { Outlet, useLocation } from 'react-router'
import { FOCUS_RING } from './focusRing.js'
import { isCacheDetailPath, isCacheEditPath, isLogFindPath } from './layoutRoutes.js'
import SiteHeader from './SiteHeader.jsx'

function Layout() {
  const pathname = useLocation().pathname
  const isLandingPage = pathname === '/'
  const isMapPage = pathname === '/map'
  const isLoginPage = pathname === '/login'
  const isLogFindPage = isLogFindPath(pathname)
  const isHideCachePage = pathname === '/caches/new'
  const isCacheDetailPage = isCacheDetailPath(pathname)
  // These pages draw their own SiteHeader; every other page gets it here.
  const hasOwnHeader =
    isLandingPage ||
    isMapPage ||
    isLoginPage ||
    isLogFindPage ||
    isHideCachePage ||
    isCacheDetailPage ||
    isCacheEditPath(pathname) ||
    pathname === '/my-caches'
  // These pages draw their own <main> too, so their header can sit outside
  // it (screen readers only treat a header as the page header when it isn't
  // inside <main>). Add a page here once it has its own <main>.
  const hasOwnMain = isCacheDetailPage || isMapPage || isLoginPage || isLogFindPage || isHideCachePage

  return (
    <>
      {!hasOwnHeader && (
        <>
          {/* Hidden until someone presses Tab, so keyboard users can jump
              past the header (pages with their own header have their own). */}
          <a
            href="#main-content"
            className={`sr-only rounded-lg bg-bg-surface px-4 py-2 text-label text-text-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 ${FOCUS_RING}`}
          >
            Skip to content
          </a>
          <SiteHeader />
        </>
      )}

      {hasOwnMain ? (
        <Outlet />
      ) : (
        <main
          id={hasOwnHeader ? undefined : 'main-content'}
          tabIndex={hasOwnHeader ? undefined : -1}
          className={`outline-none ${hasOwnHeader ? 'bg-bg-surface' : 'bg-bg-page'}`}
        >
          <Outlet />
        </main>
      )}
    </>
  )
}

export default Layout
