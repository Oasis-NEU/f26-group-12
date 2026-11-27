import { Navigate, Route, Routes } from 'react-router'
import Layout from './components/Layout.jsx'
import AddCachePage from './pages/AddCachePage.jsx'
import CacheDetailPage from './pages/CacheDetailPage.jsx'
import DevComponentsPage from './pages/DevComponentsPage.jsx'
import EditCachePage from './pages/EditCachePage.jsx'
import JournalPage from './pages/JournalPage.jsx'
import LandingPage from './pages/LandingPage.jsx'
import LeaderboardPage from './pages/LeaderboardPage.jsx'
import LogFindPage from './pages/LogFindPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import MapPage from './pages/MapPage.jsx'
import MyCachesPage from './pages/MyCachesPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

// Every page in the app and the URL it lives at.
// Most routes sit inside <Layout>, which supplies the nav bar.
// ":cacheId" is a URL parameter: in /caches/abc123, cacheId is "abc123".
// "Cache hidden!" and "Find logged!" are states inside AddCachePage and
// LogFindPage, not routes of their own.
function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* The landing page is the home page; the map lives at /map. */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/caches/new" element={<AddCachePage />} />
        <Route path="/caches/:cacheId" element={<CacheDetailPage />} />
        <Route path="/caches/:cacheId/log" element={<LogFindPage />} />
        <Route path="/caches/:cacheId/edit" element={<EditCachePage />} />
        <Route path="/journal" element={<JournalPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/my-caches" element={<MyCachesPage />} />
        {/* The landing page used to live here; old links still work. */}
        <Route path="/welcome" element={<Navigate to="/" replace />} />
      </Route>
      {/* TEMPORARY: component check page. import.meta.env.DEV is true only
          under `npm run dev`, so this route never ships to the real site. */}
      {import.meta.env.DEV && <Route path="/dev/components" element={<DevComponentsPage />} />}
      {/* "*" matches any URL not listed above. It sits outside <Layout>
          because the page draws its own SiteHeader. */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
