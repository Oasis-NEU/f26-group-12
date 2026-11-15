import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router'

const NAV_LINKS = [
  { label: 'Map', to: '/' },
  { label: 'Hide a cache', to: '/caches/new' },
  { label: 'Journal', to: '/journal' },
  { label: 'Leaderboard', to: '/leaderboard' },
]

function NavigationLinks({ mobile, onNavigate }) {
  return (
    <nav aria-label="Main navigation">
      <ul className={mobile ? 'flex flex-col gap-1' : 'flex items-center gap-8'}>
        {NAV_LINKS.map(({ label, to }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                [
                  mobile ? 'block px-4 py-3' : 'py-2',
                  'text-[15px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8102e]',
                  isActive
                    ? 'font-bold text-black'
                    : 'font-medium text-[#444] hover:text-black',
                ].join(' ')
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
        {mobile && (
          <li>
            <NavLink
              to="/login"
              onClick={onNavigate}
              className="block px-4 py-3 text-[15px] font-medium text-[#444] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8102e]"
            >
              Log in
            </NavLink>
          </li>
        )}
      </ul>
    </nav>
  )
}

function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

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
        <NavigationLinks />
        <Link
          to="/login"
          className="flex h-10 items-center justify-center border border-black px-5 text-[15px] font-bold hover:bg-[#f5f5f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8102e]"
        >
          Log in
        </Link>
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
        <div className="absolute left-0 right-0 top-full border-b border-black bg-white p-2 shadow-lg md:hidden">
          <NavigationLinks mobile onNavigate={() => setMenuOpen(false)} />
        </div>
      )}
    </header>
  )
}

export default SiteHeader
