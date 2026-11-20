import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { isCacheDetailPath } from './layoutRoutes.js'

function navLinkClass({ isActive }) {
  return isActive
    ? 'rounded-full bg-[#1f3b32] px-3 py-1.5 text-sm font-medium text-[#f9f4eb]'
    : 'rounded-full border border-[#d9d1c3] px-3 py-1.5 text-sm font-medium text-[#224034] transition hover:border-[#224034] hover:bg-[#efe8dc]'
}

function Layout() {
  const pathname = useLocation().pathname
  const isLandingPage = pathname === '/welcome'
  const isMapPage = pathname === '/'
  const isCacheDetailPage = isCacheDetailPath(pathname)
  // These pages draw their own SiteHeader, so Layout skips its old header.
  const hasOwnHeader =
    isLandingPage || isMapPage || isCacheDetailPage || pathname === '/my-caches'

  return (
    <>
      {!hasOwnHeader && (
        <header className="border-b border-[#d9d1c3] bg-[#f9f4eb]/95 backdrop-blur-sm">
          <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <Link to="/" className="flex items-center gap-3 text-[#183126]">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#254b40] text-sm font-bold text-[#f9f4eb]">
                H
              </div>
              <span className="text-lg font-semibold tracking-tight">HuskyCache</span>
            </Link>

            <ul className="flex flex-wrap items-center gap-2 sm:gap-3">
              <li>
                <NavLink to="/" end className={navLinkClass}>
                  Map
                </NavLink>
              </li>
              <li>
                <NavLink to="/caches/new" className={navLinkClass}>
                  Hide a cache
                </NavLink>
              </li>
              <li>
                <NavLink to="/journal" className={navLinkClass}>
                  Journal
                </NavLink>
              </li>
              <li>
                <NavLink to="/leaderboard" className={navLinkClass}>
                  Leaderboard
                </NavLink>
              </li>
              <li>
                <NavLink to="/login" className={navLinkClass}>
                  Log in
                </NavLink>
              </li>
            </ul>
          </nav>
        </header>
      )}

      <main className={hasOwnHeader ? 'bg-white' : 'bg-[#f7f0e5]'}>
        <Outlet />
      </main>
    </>
  )
}

export default Layout
