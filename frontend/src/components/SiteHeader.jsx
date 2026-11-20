import { Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import { supabase } from '../lib/supabaseClient.js'
import { formatPoints, getInitials, loadAccountSummary } from './accountData.js'

const NAV_LINKS = [
  { label: 'Map', to: '/' },
  { label: 'Hide a cache', to: '/caches/new' },
  { label: 'Journal', to: '/journal' },
  { label: 'Leaderboard', to: '/leaderboard' },
]

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8102e]'

// Who is logged in, plus their username and points for the menus.
// Returns undefined while checking, null when logged out, otherwise
// { id, username, points } (username/points may still be loading).
function useAccount() {
  const [userId, setUserId] = useState(undefined)
  // The last finished summary load, tagged with whose it is.
  const [summary, setSummary] = useState({ userId: null, username: '', points: 0 })

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
    })

    supabase.auth
      .getSession()
      .then(({ data }) => setUserId(data.session?.user?.id ?? null))
      .catch(() => setUserId(null))

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!userId) return
    let active = true

    loadAccountSummary(supabase, userId)
      .then((result) => {
        if (active) setSummary({ userId, ...result })
      })
      // If it fails, the menu still works; it just shows no name or points.
      .catch(() => {})

    return () => {
      active = false
    }
  }, [userId])

  if (!userId) return userId
  const loaded = summary.userId === userId
  return {
    id: userId,
    username: loaded ? summary.username : '',
    points: loaded ? summary.points : null,
  }
}

function Avatar({ username, size }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-[#f5f5f5] font-bold text-black ${
        size === 'large' ? 'size-10 text-[14px] leading-5' : 'size-9 text-[13px] leading-[18px]'
      }`}
    >
      {username ? getInitials(username) : ''}
    </span>
  )
}

function DesktopNavLinks() {
  return (
    <nav aria-label="Main navigation">
      <ul className="flex items-center gap-8">
        {NAV_LINKS.map(({ label, to }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'py-2 text-[15px] transition-colors',
                  FOCUS_RING,
                  isActive ? 'font-bold text-black' : 'font-medium text-[#444] hover:text-black',
                ].join(' ')
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// Desktop: avatar button that opens a small dropdown.
function AccountMenu({ account, onLogOut }) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  // Close when clicking anywhere outside the menu, or pressing Escape.
  useEffect(() => {
    if (!open) return
    function handlePointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false)
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const itemClass = `flex h-10 w-full items-center px-3 text-left text-[14px] font-medium leading-5 text-black hover:bg-[#f5f5f5] ${FOCUS_RING}`

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex rounded-full ${FOCUS_RING}`}
      >
        <Avatar username={account.username} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-[14px] flex w-[260px] flex-col border border-black bg-white p-2 shadow-[0_6px_20px_rgba(0,0,0,0.12)]">
          <div className="flex flex-col gap-0.5 px-3 py-2.5">
            <p className="truncate text-[14px] font-bold leading-5">{account.username}</p>
            {account.points !== null && (
              <p className="text-[12px] font-medium leading-[17px] text-[#444]">
                {formatPoints(account.points)}
              </p>
            )}
          </div>
          <div className="h-px w-full bg-[#f5f5f5]" />
          <Link to="/my-caches" onClick={() => setOpen(false)} className={itemClass}>
            My caches
          </Link>
          <button type="button" onClick={onLogOut} className={itemClass}>
            Log out
          </button>
        </div>
      )}
    </div>
  )
}

// Phones: full-screen menu under the header with the same links.
function MobileMenu({ account, onNavigate, onLogOut }) {
  const smallItem = `flex h-[52px] w-full items-center px-1 text-left text-[16px] font-medium leading-[22px] text-black ${FOCUS_RING}`

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-40 overflow-y-auto bg-white p-4 md:hidden">
      <nav aria-label="Main navigation" className="flex flex-col gap-1">
        {NAV_LINKS.map(({ label, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={`flex h-[52px] items-center px-1 text-[20px] font-extrabold leading-7 text-black ${FOCUS_RING}`}
          >
            {label}
          </NavLink>
        ))}

        <div className="h-px w-full bg-[#f5f5f5]" />

        {account ? (
          <>
            <div className="flex items-center gap-3 px-1 pb-2 pt-4">
              <Avatar username={account.username} size="large" />
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-[15px] font-bold leading-[21px]">{account.username}</p>
                {account.points !== null && (
                  <p className="text-[13px] font-medium leading-[18px] text-[#444]">
                    {formatPoints(account.points)}
                  </p>
                )}
              </div>
            </div>
            <Link to="/my-caches" onClick={onNavigate} className={smallItem}>
              My caches
            </Link>
            <button type="button" onClick={onLogOut} className={smallItem}>
              Log out
            </button>
          </>
        ) : (
          <Link to="/login" onClick={onNavigate} className={smallItem}>
            Log in
          </Link>
        )}
      </nav>
    </div>
  )
}

function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const account = useAccount()
  const navigate = useNavigate()

  async function handleLogOut() {
    setMenuOpen(false)
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b border-black bg-white px-4 md:h-16 md:px-[10%]">
      <Link to="/" className="flex items-center gap-3" aria-label="HuskyCache home">
        <span className="flex size-8 items-center justify-center bg-[#c8102e] text-[18px] font-extrabold leading-none text-white">
          N
        </span>
        <span className="text-[18px] font-extrabold leading-[25px] md:text-[20px] md:leading-7">
          HuskyCache
        </span>
      </Link>

      <div className="hidden items-center gap-8 md:flex">
        <DesktopNavLinks />
        {account === undefined ? (
          // Still checking who's logged in: hold the space so nothing jumps.
          <span className="size-9" aria-hidden="true" />
        ) : account ? (
          <AccountMenu account={account} onLogOut={handleLogOut} />
        ) : (
          <Link
            to="/login"
            className={`flex h-10 items-center justify-center border border-black px-5 text-[15px] font-bold hover:bg-[#f5f5f5] ${FOCUS_RING}`}
          >
            Log in
          </Link>
        )}
      </div>

      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={menuOpen}
        className="flex size-10 flex-col items-center justify-center gap-1 border border-black md:hidden"
      >
        {menuOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
      </button>

      {menuOpen && (
        <MobileMenu account={account} onNavigate={() => setMenuOpen(false)} onLogOut={handleLogOut} />
      )}
    </header>
  )
}

export default SiteHeader
