import { Route, Routes } from 'react-router'
import Layout from './components/Layout.jsx'
import AddCachePage from './pages/AddCachePage.jsx'
import CacheDetailPage from './pages/CacheDetailPage.jsx'
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
// All routes sit inside <Layout>, so every page gets the nav bar.
// ":cacheId" is a URL parameter: in /caches/abc123, cacheId is "abc123".
// "Cache hidden!" and "Find logged!" are states inside AddCachePage and
// LogFindPage, not routes of their own.
function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<MapPage />} />
        <Route path="/caches/new" element={<AddCachePage />} />
        <Route path="/caches/:cacheId" element={<CacheDetailPage />} />
        <Route path="/caches/:cacheId/log" element={<LogFindPage />} />
        <Route path="/caches/:cacheId/edit" element={<EditCachePage />} />
        <Route path="/journal" element={<JournalPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/my-caches" element={<MyCachesPage />} />
        <Route path="/welcome" element={<LandingPage />} />
        {/* "*" matches any URL not listed above. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
