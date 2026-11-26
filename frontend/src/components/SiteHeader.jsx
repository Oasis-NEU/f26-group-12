import { Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import { supabase } from '../lib/supabaseClient.js'
import { formatPoints, getInitials, loadAccountSummary } from './accountData.js'
import Button from './Button.jsx'
import { FOCUS_RING } from './focusRing.js'

// The bar at the top of most pages, with the logged-in account menu.
// It follows DESIGN.md's Navigation section (the Figma NavBar) using the
// theme tokens; NavBar.jsx is the logged-out-only version. Once NavBar gets
// the account menu (menus branch), pages can switch to it.

const NAV_LINKS = [
  { label: 'Map', to: '/' },
  { label: 'Hide a cache', to: '/caches/new' },
  { label: 'Journal', to: '/journal' },
  { label: 'Leaderboard', to: '/leaderboard' },
]

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
      className={`flex shrink-0 items-center justify-center rounded-full bg-bg-subtle text-label text-text-primary ${
        size === 'large' ? 'size-10' : 'size-9'
      }`}
    >
      {username ? getInitials(username) : ''}
    </span>
  )
}

// Same look as NavBar: Body text in Text Secondary; the current page is
// darker and underlined.
function navLinkClass({ isActive }) {
  return [
    `whitespace-nowrap rounded-lg py-2 text-body hover:text-text-primary ${FOCUS_RING}`,
    isActive ? 'text-text-primary underline underline-offset-4' : 'text-text-secondary',
  ].join(' ')
}

function DesktopNavLinks() {
  return (
    <nav aria-label="Main navigation">
      <ul className="flex items-center gap-8">
        {NAV_LINKS.map(({ label, to }) => (
          <li key={to}>
            <NavLink to={to} end={to === '/'} className={navLinkClass}>
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

  const itemClass = `flex h-10 w-full cursor-pointer items-center rounded-lg px-3 text-left text-body text-text-primary hover:bg-bg-subtle ${FOCUS_RING}`

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex cursor-pointer rounded-full ${FOCUS_RING}`}
      >
        <Avatar username={account.username} />
      </button>

      {open && (
        // A floating menu, so it gets the overlay shadow (DESIGN.md: only
        // things that float above the page cast one).
        <div className="absolute right-0 top-full z-40 mt-[14px] flex w-[260px] flex-col rounded-2xl border border-border-subtle bg-bg-surface p-2 shadow-overlay contrast-more:border-border-input">
          <div className="flex flex-col gap-0.5 px-3 py-2.5">
            <p className="truncate text-label text-text-primary">{account.username}</p>
            {account.points !== null && <p className="text-small text-text-secondary">{formatPoints(account.points)}</p>}
          </div>
          <div className="h-px w-full bg-border-subtle contrast-more:bg-border-input" />
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
  const smallItem = `flex h-[52px] w-full cursor-pointer items-center rounded-lg px-1 text-left text-body text-text-primary ${FOCUS_RING}`

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-40 overflow-y-auto bg-bg-surface p-4 md:hidden">
      <nav aria-label="Main navigation" className="flex flex-col gap-1">
        {NAV_LINKS.map(({ label, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex h-[52px] items-center rounded-lg px-1 text-heading text-text-primary ${FOCUS_RING} ${
                isActive ? 'underline underline-offset-4' : ''
              }`
            }
          >
            {label}
          </NavLink>
        ))}

        <div className="h-px w-full bg-border-subtle contrast-more:bg-border-input" />

        {account ? (
          <>
            <div className="flex items-center gap-3 px-1 pb-2 pt-4">
              <Avatar username={account.username} size="large" />
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-body-strong text-text-primary">{account.username}</p>
                {account.points !== null && (
                  <p className="text-small text-text-secondary">{formatPoints(account.points)}</p>
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
    <header className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b border-border-subtle bg-bg-surface px-4 contrast-more:border-border-input md:h-16 md:px-[10%]">
      <Link to="/" className={`flex items-center gap-3 rounded-lg ${FOCUS_RING}`} aria-label="HuskyCache home">
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center bg-accent text-brand-mark text-text-on-accent"
        >
          N
        </span>
        <span aria-hidden="true" className="whitespace-nowrap text-heading text-text-primary md:text-wordmark">
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
          <Button variant="secondary" to="/login">
            Log in
          </Button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={menuOpen}
        className={`flex size-10 cursor-pointer items-center justify-center rounded-lg border border-border-subtle text-text-primary hover:bg-bg-subtle contrast-more:border-border-input md:hidden ${FOCUS_RING}`}
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
