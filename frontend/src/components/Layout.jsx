import { Link, NavLink, Outlet } from 'react-router'

// Nav links are underlined, and the link for the page you're on is bold.
// NavLink passes { isActive } to className so we can style the open page.
function navLinkClass({ isActive }) {
  return isActive ? 'font-bold underline' : 'underline'
}

// The frame shared by every page: the nav bar on top, then the current page.
// <Outlet /> is the spot where React Router draws whichever page matches the URL.
function Layout() {
  return (
    <>
      <header className="border-b p-4">
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link to="/" className="font-bold">
            HuskyCache
          </Link>
          {/* NavLink is a Link that knows when its page is open (it adds
              aria-current="page"). "end" stops Map from looking open on every
              page, since every URL starts with "/". */}
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
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

      <main className="p-4">
        <Outlet />
      </main>
    </>
  )
}

export default Layout
