import { Link } from 'react-router'

// Shown for any URL that doesn't match a route in App.jsx.
function NotFoundPage() {
  return (
    <>
      <h1>Page not found</h1>
      <p>
        We couldn't find that page. <Link to="/">Back to the map</Link>
      </p>
    </>
  )
}

export default NotFoundPage
