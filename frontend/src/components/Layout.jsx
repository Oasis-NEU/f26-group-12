import { Link, NavLink, Outlet } from 'react-router'

// The frame shared by every page: the nav bar on top, then the current page.
// <Outlet /> is the spot where React Router draws whichever page matches the URL.
function Layout() {
  return (
    <>
      <header>
        <nav>
          <Link to="/">HuskyCache</Link>
          {/* NavLink is a Link that knows when its page is open (it adds
              aria-current="page"). "end" stops Map from looking open on every
              page, since every URL starts with "/". */}
          <ul>
            <li>
              <NavLink to="/" end>
                Map
              </NavLink>
            </li>
            <li>
              <NavLink to="/caches/new">Hide a cache</NavLink>
            </li>
            <li>
              <NavLink to="/journal">Journal</NavLink>
            </li>
            <li>
              <NavLink to="/leaderboard">Leaderboard</NavLink>
            </li>
            <li>
              <NavLink to="/login">Log in</NavLink>
            </li>
          </ul>
        </nav>
      </header>

      <main>
        <Outlet />
      </main>
    </>
  )
}

export default Layout
