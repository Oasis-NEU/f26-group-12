import { useEffect, useId, useState } from 'react'
import { NavLink } from 'react-router'
import Button from './Button.jsx'
import { FOCUS_RING } from './focusRing.js'
import Logo from './Logo.jsx'

// The bar at the top of every page, from the Figma "NavBar" component
// (the logged-out version).
//
// Figma variants -> props:
//   Size: Desktop | Phone -> size="desktop" | "phone"
// Leave size out (or "responsive") and it switches by itself: phone layout
// on small screens, desktop from the md breakpoint (768px) up.
//
// The current page sits in a soft Subtle pill (as in SiteHeader). On
// phones the menu button opens the same pages in a list under the bar.

const NAV_LINKS = [
  { label: 'Map', to: '/map' },
  { label: 'Hide a cache', to: '/caches/new' },
  { label: 'Journal', to: '/journal' },
  { label: 'Leaderboard', to: '/leaderboard' },
]

// Which classes each size uses. "responsive" uses md: to switch at 768px.
const LAYOUTS = {
  responsive: {
    bar: 'h-14 px-4 md:h-16 md:px-6',
    desktopOnly: 'hidden md:flex',
    phoneOnly: 'md:hidden',
  },
  desktop: { bar: 'h-16 px-6', desktopOnly: 'flex', phoneOnly: 'hidden' },
  phone: { bar: 'h-14 px-4', desktopOnly: 'hidden', phoneOnly: '' },
}

function navLinkClass({ isActive }) {
  return [
    `flex h-10 items-center whitespace-nowrap rounded-full px-4 text-label ${FOCUS_RING}`,
    isActive ? 'bg-bg-subtle text-text-primary' : 'text-text-secondary hover:bg-bg-page hover:text-text-primary',
  ].join(' ')
}

function NavBar({ size = 'responsive', className = '' }) {
  const layout = LAYOUTS[size] ?? LAYOUTS.responsive
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()

  // Pressing Escape closes the phone menu.
  useEffect(() => {
    if (!menuOpen) return
    function handleKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <header
      className={`relative flex shrink-0 items-center justify-between border-b border-border-subtle bg-bg-surface ${layout.bar} ${className}`}
    >
      <Logo />

      <nav aria-label="Main navigation" className={`items-center gap-1 ${layout.desktopOnly}`}>
        {NAV_LINKS.map(({ label, to }) => (
          <NavLink key={to} to={to} end={to === '/'} className={navLinkClass}>
            {label}
          </NavLink>
        ))}
        <Button variant="secondary" to="/login" className="ml-5">
          Log in
        </Button>
      </nav>

      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={menuOpen}
        aria-controls={menuId}
        className={`flex size-10 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-border-subtle hover:bg-bg-subtle ${FOCUS_RING} ${layout.phoneOnly}`}
      >
        {/* Three 18 x 2 lines, as drawn in Figma. */}
        <span aria-hidden="true" className="h-0.5 w-[18px] bg-text-primary" />
        <span aria-hidden="true" className="h-0.5 w-[18px] bg-text-primary" />
        <span aria-hidden="true" className="h-0.5 w-[18px] bg-text-primary" />
      </button>

      {menuOpen && (
        <nav
          id={menuId}
          aria-label="Main navigation"
          className={`absolute inset-x-0 top-full z-40 flex-col gap-1 border-b border-border-subtle bg-bg-surface p-4 ${
            layout.phoneOnly === 'hidden' ? 'hidden' : `flex ${layout.phoneOnly}`
          }`}
        >
          {NAV_LINKS.map(({ label, to }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={closeMenu}
              className={({ isActive }) =>
                `flex h-[52px] items-center rounded-lg px-3 text-heading ${FOCUS_RING} ${isActive ? 'bg-bg-subtle' : ''}`
              }
            >
              {label}
            </NavLink>
          ))}
          <Button variant="secondary" to="/login" fullWidth onClick={closeMenu} className="mt-2">
            Log in
          </Button>
        </nav>
      )}
    </header>
  )
}

export default NavBar
