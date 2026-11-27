import { Search, X } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { mapSearchPath, readSearch, withSearch } from '../lib/searchQuery.js'
import { FOCUS_RING } from './focusRing.js'

// The search box in the header (desktop only; on phones the map has its
// own). On the map it filters the caches as you type. On any other page,
// Enter takes you to the map showing what matches, with focus back in this
// box. The search is kept in the address bar as ?q= (see searchQuery.js).

function HeaderSearch({ className = '' }) {
  const { pathname, state } = useLocation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const onMap = pathname === '/map'
  // Off the map, what's typed so far (nothing is searched until Enter).
  const [draft, setDraft] = useState('')
  const value = onMap ? readSearch(params) : draft

  function change(text) {
    // replace: typing doesn't add a history entry per letter.
    if (onMap) setParams((current) => withSearch(current, text), { replace: true })
    else setDraft(text)
  }

  function submit(event) {
    event.preventDefault()
    if (!onMap) navigate(mapSearchPath(draft), { state: { focusSearch: true } })
  }

  return (
    <form role="search" onSubmit={submit} className={`relative min-w-0 ${className}`}>
      <label htmlFor="site-search" className="sr-only">
        Search caches or places
      </label>
      <Search
        aria-hidden="true"
        size={18}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary"
      />
      <input
        id="site-search"
        type="search"
        value={value}
        onChange={(event) => change(event.target.value)}
        placeholder="Search caches or places"
        autoComplete="off"
        enterKeyHint="search"
        // Arriving on the map from a search elsewhere: keep typing here.
        autoFocus={onMap && Boolean(state?.focusSearch)}
        className={`h-11 w-full appearance-none rounded-full border border-border-input bg-bg-surface pl-11 pr-11 text-body text-text-primary placeholder:text-text-secondary [&::-webkit-search-cancel-button]:appearance-none ${FOCUS_RING}`}
      />
      {/* Our own clear button; the browser's looks different everywhere. It
          appears as you type, so it doesn't animate in (that would make
          typing feel slow); pressing it shrinks it like any button. */}
      {value && (
        <button
          type="button"
          onClick={() => {
            change('')
            document.getElementById('site-search')?.focus()
          }}
          aria-label="Clear search"
          className={`absolute right-1 top-1 flex size-9 cursor-pointer items-center justify-center rounded-full text-text-secondary hover:bg-bg-subtle hover:text-text-primary active:scale-97 motion-safe:transition-[background-color,color,scale] motion-safe:duration-150 motion-safe:ease-out ${FOCUS_RING}`}
        >
          <X aria-hidden="true" size={18} />
        </button>
      )}
    </form>
  )
}

export default HeaderSearch
