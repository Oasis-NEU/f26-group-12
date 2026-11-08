import { BrowserRouter, Route, Routes } from 'react-router'
import Layout from './components/layout.jsx'
import CreateCachePage from './pages/createcache.jsx'
import LeaderboardPage from './pages/leaderboard.jsx'
import MapPage from './pages/mappage.jsx'
import NotFoundPage from './pages/notfound.jsx'
import ProfilePage from './pages/profile.jsx'

// Each <Route> matches a URL path to the page component shown for it.
// The routes are nested inside Layout, so every page gets the same nav bar.
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<MapPage />} />
          <Route path="/create" element={<CreateCachePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          {/* "*" matches any URL not listed above */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
