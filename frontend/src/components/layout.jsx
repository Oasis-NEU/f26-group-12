import { Link, Outlet } from 'react-router'

// Shared frame for every page: the nav bar on top, then the current page.
// <Outlet /> is where React Router puts the page that matches the URL.
function Layout() {
  return (
    <>
      <nav>
        {/* Link changes the page without reloading the whole site */}
        <Link to="/">Map</Link> | <Link to="/create">Hide a cache</Link> |{' '}
        <Link to="/leaderboard">Leaderboard</Link> |{' '}
        <Link to="/profile">Profile</Link>
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  )
}

export default Layout
