import { CornerDownLeft, MapPin, Package, Search, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { matchParts, searchSuggestions } from '../lib/cacheSearch.js'
import { mapSearchPath, readSearch, withSearch } from '../lib/searchQuery.js'
import { useSearchableCaches } from '../lib/useSearchableCaches.js'
import { FOCUS_RING } from './focusRing.js'

// The search box in the header (desktop only; on phones the map has its
// own). It finds caches by name or by the place the hider named ("near
// Snell"), not street addresses (yet), so it says "Search caches".
//
// As you type, a box under it suggests matching caches and places, like a
// map app: a cache opens its page; a place shows its caches on the map; the
// last row shows every match on the map. Arrow keys move through the
// suggestions, Enter picks one, Escape closes the box. (It's the ARIA
// combobox pattern, so screen readers hear each suggestion.)
//
// On the map, typing also filters the list as you type, and Enter with no
// suggestion picked moves to the first match. Anywhere else, Enter goes to
// the map showing the matches. The search is kept in the address bar as ?q=
// (see searchQuery.js).

// The map's list of caches marks itself with data-map-results, so Enter here
// can move to its first card.
function focusFirstResult() {
  document.querySelector('[data-map-results] a, [data-map-results] button')?.focus()
}

function cachesText(count) {
  return count === 1 ? '1 cache' : `${count} caches`
}

// The typed text in bold wherever it appears in a suggestion.
function Highlighted({ text, query }) {
  return matchParts(text, query).map((part, index) =>
    part.match ? (
      <strong key={index} className="font-bold">
        {part.text}
      </strong>
    ) : (
      <span key={index}>{part.text}</span>
    ),
  )
}

function HeaderSearch({ className = '' }) {
  const { pathname, search, state } = useLocation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const inputRef = useRef(null)
  const formRef = useRef(null)
  const baseId = useId()
  const listId = `${baseId}-list`
  const hintId = `${baseId}-hint`
  const onMap = pathname === '/map'
  // Off the map, what's typed so far.
  const [draft, setDraft] = useState('')
  const value = onMap ? readSearch(params) : draft
  // Arriving on the map from a search elsewhere: keep typing here.
  const focusOnArrival = onMap && Boolean(state?.focusSearch)
  const [focused, setFocused] = useState(false)
  // Escape (or picking something) hides the suggestions until the next key.
  const [dismissed, setDismissed] = useState(focusOnArrival)
  // Which suggestion the arrow keys are on (-1: none, typing in the box).
  const [active, setActive] = useState(-1)
  const { caches, loading, failed } = useSearchableCaches(focused)

  // Use that "focus the search" note once, so a reload or Back to this page
  // doesn't jump into the box again.
  useEffect(() => {
    if (focusOnArrival) navigate({ pathname, search }, { replace: true, state: null })
  }, [focusOnArrival, navigate, pathname, search])

  const suggestions = useMemo(() => searchSuggestions(caches, value), [caches, value])

  // Every row you can pick, in order: caches, places, then "See all" (only
  // when there are more matches than the box lists).
  const options = [
    ...suggestions.caches.map((cache) => ({ kind: 'cache', key: `cache-${cache.id}`, ...cache })),
    ...suggestions.places.map((place) => ({ kind: 'place', key: `place-${place.name}`, ...place })),
    ...(suggestions.total > suggestions.caches.length ? [{ kind: 'all', key: 'all' }] : []),
  ]
  const optionId = (index) => `${baseId}-option-${index}`

  const typed = Boolean(value.trim())
  const open = focused && typed && !dismissed
  const listShown = open && options.length > 0

  // Keep the picked suggestion in view as the arrow keys move.
  useEffect(() => {
    if (active >= 0) document.getElementById(`${baseId}-option-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, baseId])

  function change(text) {
    setDismissed(false)
    setActive(-1)
    // replace: typing doesn't add a history entry per letter.
    if (onMap) setParams((current) => withSearch(current, text), { replace: true })
    else setDraft(text)
  }

  function showAllOnMap() {
    setDismissed(true)
    if (onMap) focusFirstResult()
    else navigate(mapSearchPath(draft), { state: { focusSearch: true } })
  }

  function choose(option) {
    setDismissed(true)
    setActive(-1)
    if (option.kind === 'cache') navigate(`/caches/${option.id}`)
    else if (option.kind === 'place') {
      if (onMap) setParams((current) => withSearch(current, option.name), { replace: true })
      else navigate(mapSearchPath(option.name), { state: { focusSearch: true } })
    } else showAllOnMap()
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!typed) return
      event.preventDefault()
      if (!open) {
        setDismissed(false)
        return
      }
      if (!options.length) return
      // -1 (the box itself), then each suggestion, then back to the box.
      const step = event.key === 'ArrowDown' ? 1 : -1
      const slots = options.length + 1
      setActive((current) => ((current + 1 + step + slots) % slots) - 1)
    } else if (event.key === 'Enter' && listShown && active >= 0 && active < options.length) {
      event.preventDefault()
      choose(options[active])
    } else if (event.key === 'Escape' && open) {
      // Also stops the browser clearing the box, which Escape does in some.
      event.preventDefault()
      setDismissed(true)
      setActive(-1)
    }
  }

  function submit(event) {
    event.preventDefault()
    showAllOnMap()
  }

  const showEnterHint = !onMap && typed && !listShown

  return (
    <form
      ref={formRef}
      role="search"
      onSubmit={submit}
      onFocus={() => setFocused(true)}
      // Closes when focus leaves the search (clicks on a suggestion keep
      // focus in the box, so they don't count).
      onBlur={(event) => {
        if (!formRef.current?.contains(event.relatedTarget)) {
          setFocused(false)
          setActive(-1)
        }
      }}
      className={`relative min-w-0 ${className}`}
    >
      <label htmlFor="site-search" className="sr-only">
        Search caches
      </label>
      <input
        ref={inputRef}
        id="site-search"
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={listShown}
        aria-controls={listShown ? listId : undefined}
        aria-activedescendant={listShown && active >= 0 ? optionId(active) : undefined}
        aria-describedby={onMap ? undefined : hintId}
        value={value}
        onChange={(event) => change(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search caches"
        autoComplete="off"
        enterKeyHint="search"
        autoFocus={focusOnArrival}
        className={`h-10 w-full appearance-none rounded-full border border-border-input bg-bg-surface pl-11 text-body text-text-primary placeholder:text-text-secondary [&::-webkit-search-cancel-button]:appearance-none ${
          showEnterHint ? 'pr-28' : 'pr-11'
        } ${FOCUS_RING}`}
      />
      {/* For screen readers, what Enter does off the map. */}
      {!onMap && (
        <span id={hintId} className="sr-only">
          Press Enter to see matching caches on the map.
        </span>
      )}
      {/* The magnifier is the search button, so a mouse can search too. */}
      <button
        type="submit"
        aria-label={onMap ? 'Go to the first match' : 'Search the map'}
        title={onMap ? 'Go to the first match' : 'Search the map'}
        className={`absolute left-1 top-1 flex size-8 cursor-pointer items-center justify-center rounded-full text-text-secondary hover:bg-bg-subtle hover:text-text-primary active:scale-97 motion-safe:transition-[background-color,color,scale] motion-safe:duration-150 motion-safe:ease-out ${FOCUS_RING}`}
      >
        <Search aria-hidden="true" size={18} />
      </button>
      {showEnterHint && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-10 top-1/2 flex -translate-y-1/2 items-center gap-1 text-small text-text-secondary"
        >
          <CornerDownLeft size={14} />
          Enter
        </span>
      )}
      {/* Our own clear button; the browser's looks different everywhere. It
          appears as you type, so it doesn't animate in (that would make
          typing feel slow); pressing it shrinks it like any button. */}
      {value && (
        <button
          type="button"
          onClick={() => {
            change('')
            inputRef.current?.focus()
          }}
          aria-label="Clear search"
          className={`absolute right-1 top-1 flex size-8 cursor-pointer items-center justify-center rounded-full text-text-secondary hover:bg-bg-subtle hover:text-text-primary active:scale-97 motion-safe:transition-[background-color,color,scale] motion-safe:duration-150 motion-safe:ease-out ${FOCUS_RING}`}
        >
          <X aria-hidden="true" size={18} />
        </button>
      )}

      {/* The suggestions: a floating box under the search (so it gets the
          overlay shadow). It appears as you type, so it doesn't animate. */}
      {open && (
        <div className="absolute inset-x-0 top-full z-40 mt-2 max-h-[min(28rem,70dvh)] overflow-y-auto overscroll-contain rounded-2xl border border-border-subtle bg-bg-surface p-2 shadow-overlay contrast-more:border-border-input">
          {loading && <p className="px-3 py-2.5 text-small text-text-secondary">Loading caches…</p>}
          {failed && (
            <p className="px-3 py-2.5 text-small text-text-secondary">
              Couldn’t load suggestions. Press Enter to search the map.
            </p>
          )}
          {!loading && !failed && !options.length && (
            <p className="px-3 py-2.5 text-small text-text-secondary">
              No caches match “{value.trim()}”. Try part of a cache’s name or a place, like “Snell”.
            </p>
          )}
          <div id={listId} role="listbox" aria-label="Suggestions" hidden={!listShown}>
            {[
              { kind: 'cache', heading: 'Caches' },
              { kind: 'place', heading: 'Places' },
              { kind: 'all', heading: null },
            ].map(({ kind, heading }) => {
              const rows = options.map((option, index) => ({ option, index })).filter(({ option }) => option.kind === kind)
              if (!rows.length) return null
              const headingId = `${baseId}-${kind}-heading`
              return (
                <div
                  key={kind}
                  role="group"
                  aria-labelledby={heading ? headingId : undefined}
                  aria-label={heading ? undefined : 'More'}
                  className={kind === 'all' ? 'mt-1 border-t border-border-subtle pt-1 contrast-more:border-border-input' : ''}
                >
                  {heading && (
                    <div id={headingId} role="presentation" className="px-3 pb-1 pt-2 text-small text-text-secondary">
                      {heading}
                    </div>
                  )}
                  {rows.map(({ option, index }) => {
                    const Icon = { cache: Package, place: MapPin, all: Search }[option.kind]
                    let main
                    let sub = null
                    if (option.kind === 'cache') {
                      main = <Highlighted text={option.title} query={value} />
                      sub = option.place ? <Highlighted text={option.place} query={value} /> : null
                    } else if (option.kind === 'place') {
                      main = <Highlighted text={option.name} query={value} />
                      sub = `${cachesText(option.count)} here`
                    } else {
                      main = onMap
                        ? `Show all ${suggestions.total} in the list`
                        : `See all ${cachesText(suggestions.total)} on the map`
                    }
                    return (
                      <div
                        key={option.key}
                        id={optionId(index)}
                        role="option"
                        aria-selected={index === active}
                        // Keep focus in the box, so the click isn't a blur.
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => choose(option)}
                        onMouseMove={() => setActive(index)}
                        className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 py-1.5 ${
                          index === active ? 'bg-bg-subtle' : ''
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-page text-text-secondary"
                        >
                          <Icon size={16} />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-body text-text-primary">{main}</span>
                          {sub && <span className="truncate text-small text-text-secondary">{sub}</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </form>
  )
}

export default HeaderSearch
