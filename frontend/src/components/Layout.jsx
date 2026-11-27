import { Outlet, useLocation } from 'react-router'
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
      {!hasOwnHeader && <SiteHeader />}

      {hasOwnMain ? (
        <Outlet />
      ) : (
        <main className={hasOwnHeader ? 'bg-white' : 'bg-[#f7f0e5]'}>
          <Outlet />
        </main>
      )}
    </>
  )
}

export default Layout
