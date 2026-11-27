import { Menu, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'
import { supabase } from '../lib/supabaseClient.js'
import { formatPoints, getInitials, loadAccountSummary } from './accountData.js'
import Button from './Button.jsx'
import { FOCUS_RING } from './focusRing.js'
import HeaderSearch from './HeaderSearch.jsx'
import Logo from './Logo.jsx'

// The bar at the top of every page, with the logged-in account menu.
// It follows DESIGN.md's Navigation section, using the theme tokens.
//
// Desktop (lg:, 1024px): the logo at the far left, the cache search, then
// the pages and the account menu (or "Log in") at the right. The current
// page sits in a soft Subtle pill rather than being underlined, so the
// pages read as places you can be, not as links. Phones (the base styles):
// the logo and a menu button that opens the same pages full screen. The
// map has its own search on phones.

const NAV_LINKS = [
  { label: 'Map', to: '/map' },
  { label: 'Hide a cache', to: '/caches/new' },
  { label: 'Journal', to: '/journal' },
  { label: 'Leaderboard', to: '/leaderboard' },
]

// Who is logged in, plus their username and points for the menus.
// Returns undefined while checking, null when logged out, otherwise
// { id, username, points } (username/points may still be loading).
//
// Every page draws its own header, so this is remembered between pages
// (below): a new page shows the last account straight away instead of a
// blank avatar, and only reloads the name and points when they're over 30
// seconds old.
const SUMMARY_FRESH_MS = 30000
const remembered = { userId: undefined, summary: null, loadedAt: 0 }

function useAccount() {
  const [userId, setUserId] = useState(remembered.userId)
  // The last finished summary load, tagged with whose it is.
  const [summary, setSummary] = useState(remembered.summary)

  useEffect(() => {
    function update(id) {
      remembered.userId = id
      setUserId(id)
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => update(session?.user?.id ?? null))

    supabase.auth
      .getSession()
      .then(({ data }) => update(data.session?.user?.id ?? null))
      .catch(() => update(null))

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!userId) return
    const fresh = remembered.summary?.userId === userId && Date.now() - remembered.loadedAt < SUMMARY_FRESH_MS
    if (fresh) return
    let active = true

    loadAccountSummary(supabase, userId)
      .then((result) => {
        const loaded = { userId, ...result }
        remembered.summary = loaded
        remembered.loadedAt = Date.now()
        if (active) setSummary(loaded)
      })
      // If it fails, the menu still works; it just shows no name or points.
      .catch(() => {})

    return () => {
      active = false
    }
  }, [userId])

  if (!userId) return userId
  const loaded = summary?.userId === userId
  return {
    id: userId,
    username: loaded ? summary.username : '',
    points: loaded ? summary.points : null,
  }
}

function Avatar({ username }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-label text-text-primary"
    >
      {username ? getInitials(username) : ''}
    </span>
  )
}

// A page in the bar: Label text in a 40px pill, the same height as the
// search, the avatar and "Log in", so the bar sits on one line. The current
// page is Text on the Subtle fill (with Increase Contrast, also a Border
// Input edge, since the fill alone is faint); the others are Text
// Secondary, darkening on hover over a paler fill (150ms). Pressing one
// shrinks it to 97%, like a button. Moving between pages doesn't animate:
// it happens all day, and every page draws its own header. (NavLink marks
// the current one with aria-current="page".)
function navLinkClass({ isActive }) {
  return [
    `flex h-10 items-center whitespace-nowrap rounded-full px-3 text-label active:scale-97 xl:px-4 motion-safe:transition-[background-color,color,scale] motion-safe:duration-150 motion-safe:ease-out ${FOCUS_RING}`,
    isActive
      ? 'bg-bg-subtle text-text-primary contrast-more:inset-ring-1 contrast-more:inset-ring-border-input'
      : 'text-text-secondary hover:bg-bg-page hover:text-text-primary',
  ].join(' ')
}

function DesktopNavLinks() {
  return (
    <nav aria-label="Main navigation">
      <ul className="flex items-center gap-1">
        {NAV_LINKS.map(({ label, to }) => (
          <li key={to}>
            <NavLink to={to} className={navLinkClass}>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// Desktop: the avatar opens a small panel with the account's name and
// points, "My caches" and "Log out". It's a simple show/hide panel (a
// disclosure), not an arrow-key menu, so it says only that it's expanded.
// It closes on a click outside, on Escape (focus goes back to the avatar),
// or when focus moves out of it (e.g. tabbing past "Log out").
function AccountMenu({ account, onLogOut }) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)
  const buttonRef = useRef(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false)
    }
    function handleKeyDown(event) {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    // focusin, not blur: clicking a button inside doesn't focus it in
    // Safari, and a blur would close the panel before the click lands.
    function handleFocusIn(event) {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', handleFocusIn)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', handleFocusIn)
    }
  }, [open])

  const itemClass = `flex h-10 w-full cursor-pointer items-center rounded-lg px-3 text-left text-body text-text-primary hover:bg-bg-subtle ${FOCUS_RING}`

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        // Says whose account it is, so nobody has to open it to check.
        aria-label={account.username ? `Account menu for ${account.username}` : 'Account menu'}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className={`flex cursor-pointer rounded-full active:scale-97 motion-safe:transition-[scale] motion-safe:duration-150 motion-safe:ease-out ${FOCUS_RING}`}
      >
        <Avatar username={account.username} />
      </button>

      {open && (
        // A floating panel, so it gets the overlay shadow (DESIGN.md: only
        // things that float above the page cast one). It fades in and grows
        // from 97% out of the avatar's corner (150ms); with reduced motion it
        // only fades. Closing is instant.
        <div
          id={panelId}
          className="absolute right-0 top-full z-40 mt-3 flex w-[260px] origin-top-right flex-col rounded-2xl border border-border-subtle bg-bg-surface p-2 shadow-overlay transition-[opacity,scale] duration-150 ease-out starting:opacity-0 contrast-more:border-border-input motion-safe:starting:scale-97"
        >
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

// Phones and tablets: the same pages full screen under the header. The
// current page has a 4px ink bar at its left as well as the Subtle fill, so
// it shows in bright sun (the fill alone barely does). Focus moves to the
// first page when it opens.
function MobileMenu({ id, account, onNavigate, onLogOut }) {
  const firstLinkRef = useRef(null)
  const smallItem = `flex h-[52px] w-full cursor-pointer items-center rounded-lg px-4 text-left text-body text-text-primary hover:bg-bg-subtle ${FOCUS_RING}`

  useEffect(() => {
    firstLinkRef.current?.focus()
  }, [])

  return (
    // Fades in and drops 4px from the header (200ms); with reduced motion it
    // only fades. Closing is instant. overscroll-contain keeps a scroll in
    // here from moving the page behind.
    <div
      id={id}
      className="fixed inset-x-0 bottom-0 top-14 z-40 overflow-y-auto overscroll-contain bg-bg-surface p-4 transition-[opacity,translate] duration-200 ease-out starting:opacity-0 lg:hidden motion-safe:starting:-translate-y-1"
    >
      <nav aria-label="Main navigation" className="flex flex-col gap-1">
        {NAV_LINKS.map(({ label, to }, index) => (
          <NavLink
            key={to}
            ref={index === 0 ? firstLinkRef : undefined}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `relative flex h-[52px] items-center rounded-lg px-4 text-heading text-text-primary ${FOCUS_RING} ${
                isActive ? 'bg-bg-subtle contrast-more:inset-ring-1 contrast-more:inset-ring-border-input' : 'hover:bg-bg-page'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span aria-hidden="true" className="absolute left-1.5 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-text-primary" />
                )}
                {label}
              </>
            )}
          </NavLink>
        ))}

        <div className="h-px w-full bg-border-subtle contrast-more:bg-border-input" />

        {/* While checking who's logged in, show neither (no "Log in" flash). */}
        {account ? (
          <>
            <div className="flex items-center gap-3 px-4 pb-2 pt-4">
              <Avatar username={account.username} />
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
          account === null && (
            <Button variant="secondary" to="/login" fullWidth onClick={onNavigate} className="mt-3">
              Log in
            </Button>
          )
        )}
      </nav>
    </div>
  )
}

function SiteHeader() {
  const { pathname } = useLocation()
  // The page the menu was opened on, so it closes by itself when the page
  // changes (e.g. browser Back), not only when a link in it is tapped.
  const [menuOpenOn, setMenuOpenOn] = useState(null)
  const menuOpen = menuOpenOn === pathname
  const account = useAccount()
  const navigate = useNavigate()
  const headerRef = useRef(null)
  const toggleRef = useRef(null)
  const menuId = useId()

  // While the phone menu is open it covers the page, so the page behind
  // can't be reached with Tab (inert) or scrolled, and Escape closes it,
  // putting focus back on the menu button. Growing the window past 1024px
  // (where the menu is hidden) closes it too.
  useEffect(() => {
    if (!menuOpen) return
    const header = headerRef.current
    const behind = [...(header?.parentElement?.children ?? [])].filter((element) => element !== header)
    behind.forEach((element) => {
      element.inert = true
    })
    const root = document.documentElement
    const overflowBefore = root.style.overflow
    root.style.overflow = 'hidden'

    function handleKeyDown(event) {
      if (event.key !== 'Escape') return
      setMenuOpenOn(null)
      toggleRef.current?.focus()
    }
    const desktop = window.matchMedia('(min-width: 64rem)')
    function handleResize() {
      if (desktop.matches) setMenuOpenOn(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    desktop.addEventListener('change', handleResize)
    return () => {
      behind.forEach((element) => {
        element.inert = false
      })
      root.style.overflow = overflowBefore
      document.removeEventListener('keydown', handleKeyDown)
      desktop.removeEventListener('change', handleResize)
    }
  }, [menuOpen])

  async function handleLogOut() {
    setMenuOpenOn(null)
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <header
      ref={headerRef}
      className="relative z-30 flex h-14 shrink-0 items-center gap-6 border-b border-border-subtle bg-bg-surface px-4 contrast-more:border-border-input lg:h-16 lg:px-6"
    >
      <Logo />

      {/* Fills all the space between the logo and the pages, stopping 24px
          (the bar's gap) before "Map". */}
      <HeaderSearch className="hidden flex-1 lg:block" />

      <div className="ml-auto hidden shrink-0 items-center gap-6 lg:flex">
        <DesktopNavLinks />
        {account === undefined ? (
          // Still checking who's logged in: hold the space "Log in" takes,
          // so the search doesn't shrink when it appears.
          <span className="h-10 w-20" aria-hidden="true" />
        ) : account ? (
          <AccountMenu account={account} onLogOut={handleLogOut} />
        ) : (
          <Button variant="secondary" size="small" to="/login">
            Log in
          </Button>
        )}
      </div>

      <button
        ref={toggleRef}
        type="button"
        onClick={() => setMenuOpenOn(menuOpen ? null : pathname)}
        // One label; aria-expanded says whether it's open.
        aria-label="Navigation menu"
        aria-expanded={menuOpen}
        aria-controls={menuOpen ? menuId : undefined}
        className={`ml-auto flex size-10 cursor-pointer items-center justify-center rounded-lg border border-border-subtle text-text-primary hover:bg-bg-subtle active:scale-97 contrast-more:border-border-input lg:hidden motion-safe:transition-[background-color,scale] motion-safe:duration-150 motion-safe:ease-out ${FOCUS_RING}`}
      >
        {/* The new icon pops in from 75% (150ms), so the swap reads as one
            button changing; with reduced motion it just swaps. */}
        <span
          key={menuOpen ? 'close' : 'open'}
          className="block motion-safe:transition-[opacity,scale] motion-safe:duration-150 motion-safe:ease-out motion-safe:starting:scale-75 motion-safe:starting:opacity-0"
        >
          {menuOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
        </span>
      </button>

      {menuOpen && (
        <MobileMenu id={menuId} account={account} onNavigate={() => setMenuOpenOn(null)} onLogOut={handleLogOut} />
      )}
    </header>
  )
}

export default SiteHeader
