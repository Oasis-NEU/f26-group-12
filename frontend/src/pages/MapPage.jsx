import { APIProvider, AdvancedMarker, AdvancedMarkerAnchorPoint, Map as GoogleMap, useMap } from '@vis.gl/react-google-maps'
import { List, LocateFixed, Map as MapIcon, Minus, Plus, School, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import Button from '../components/Button.jsx'
import CacheCard, { FoundTag } from '../components/CacheCard.jsx'
import DifficultyMeter from '../components/DifficultyMeter.jsx'
import { FOCUS_RING } from '../components/focusRing.js'
import MapPin from '../components/MapPin.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { readSearch, withSearch } from '../lib/searchQuery.js'
import { useMapData } from '../lib/useMapData.js'
import { useMyLocation } from '../lib/useMyLocation.js'
import { cacheCoordinates } from './cacheDetail/coords.js'
import { filterCaches } from './mapData.js'

// The map of caches. From the Figma section "Map · /".
//
// Phones (the base styles): the map fills the screen, with search, the
// filters and a List button floating on top. Tapping a pin brings up a card
// for that cache under the map. "List" swaps the map for the list of caches.
// Desktop (lg:): the list moves into a panel on the left, and the search is
// the one in the header. Clicking a pin highlights its card in the list and
// opens a small popup beside the pin instead of the card.
//
// The search is kept in the address bar as ?q= (searchQuery.js), shared by
// this page's search box and the header's.
//
// The data (caches, your finds, who's signed in) comes from useMapData, and
// "Show my location" from useMyLocation (both in src/lib); this file only
// decides how to show them.

const CAMPUS_CENTER = { lat: 42.3398, lng: -71.0892 }
const CAMPUS_ZOOM = 15
// Close enough to see the paths around a cache.
const CLOSE_ZOOM = 16
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'to-find', label: 'To find' },
  { id: 'my-finds', label: 'My finds' },
]
// Every control on the map: white, a dark edge, 48px to tap on phones and
// 40px on desktop (to match the zoom buttons).
const MAP_BUTTON = `flex size-12 cursor-pointer items-center justify-center rounded-lg border border-border-strong bg-bg-surface text-text-primary hover:bg-bg-subtle lg:size-10 ${FOCUS_RING}`

// Hiders often type the location lowercase ("near Snell Library"), so show
// it with a capital first letter. The saved text isn't changed.
function placeName(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : ''
}

// The line above the list: how many caches are showing, in the filter's words.
function countText(count, filter, searching) {
  if (searching) return count === 1 ? '1 match' : `${count} matches`
  if (filter === 'to-find') return `${count} to find`
  if (filter === 'my-finds') return `${count} found by you`
  return count === 1 ? '1 cache' : `${count} caches`
}

// What screen readers hear for a pin: its name, difficulty and, for
// logged-in people, whether they've found it.
function pinLabel(cache, found, signedIn) {
  const level = Math.min(5, Math.max(1, Math.round(Number(cache.difficulty)) || 1))
  const state = signedIn ? (found ? ', found by you' : ', not found yet') : ''
  return `${cache.title}, difficulty ${level}${state}`
}

// True on desktop-sized screens (Tailwind's lg, 1024px), where the list is
// always shown and a pin opens the popup instead of the phone card.
function useIsDesktop() {
  const query = '(min-width: 64rem)'
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setMatches(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return matches
}

// Hands the Google map object up to the page, so buttons can move it
// (pan, zoom) without the page re-drawing every pin while it's dragged.
function MapHandle({ onMap }) {
  const map = useMap()
  useEffect(() => {
    onMap(map)
  }, [map, onMap])
  return null
}

// The search box (phones and tablets; desktop uses the header's). It has no
// visible label (as in Figma), so screen readers get one instead. Our own
// clear button replaces the browser's, which looks different in every
// browser.
function SearchField({ value, onChange }) {
  return (
    <div className="relative w-full lg:hidden">
      <label htmlFor="cache-search" className="sr-only">
        Search caches or places
      </label>
      <input
        id="cache-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search caches or places"
        autoComplete="off"
        className={`h-12 w-full appearance-none rounded-lg border border-border-input bg-bg-surface pl-4 pr-12 text-body text-text-primary placeholder:text-text-secondary [&::-webkit-search-cancel-button]:appearance-none ${FOCUS_RING}`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className={`absolute right-1 top-1 flex size-10 cursor-pointer items-center justify-center rounded-lg text-text-secondary hover:text-text-primary ${FOCUS_RING}`}
        >
          <X aria-hidden="true" size={18} />
        </button>
      )}
    </div>
  )
}

// The chip look: 32px, 8px corners. Selected is the dark Inverse fill.
function chipClass(selected) {
  return `flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-3.5 text-label ${
    selected
      ? 'border-bg-inverse bg-bg-inverse text-text-on-accent'
      : 'border-border-strong bg-bg-surface text-text-primary hover:bg-bg-subtle'
  } ${FOCUS_RING}`
}

// All / To find / My finds. Only shown to logged-in people: the other two
// need to know what you've found.
function FilterChips({ value, onChange }) {
  return (
    <div role="group" aria-label="Show caches" className="flex gap-2">
      {FILTERS.map(({ id, label }) => (
        <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)} className={chipClass(value === id)}>
          {label}
        </button>
      ))}
    </div>
  )
}

// A short message in a white box, for loading, empty and error states.
function Notice({ role = 'status', children }) {
  return (
    <div
      role={role}
      className="rounded-2xl border border-border-subtle bg-bg-surface p-4 text-body text-text-secondary contrast-more:border-border-input"
    >
      {children}
    </div>
  )
}

// Why the map isn't showing. failed: Google Maps tried and couldn't load.
function mapUnavailableText(failed) {
  return failed ? 'Google Maps couldn’t load right now.' : 'The map isn’t set up here yet.'
}

// One cache on the map: our MapPin (red to find, green once found, bigger
// with a gold ring when selected), centred on the cache's spot. The marker
// is the clickable part, so the pin only adds the hover grow.
function CachePinMarker({ cache, position, found, selected, signedIn, onSelect }) {
  return (
    <AdvancedMarker
      position={position}
      // Google uses the title as the pin's name for screen readers.
      title={pinLabel(cache, found, signedIn)}
      // The selected pin sits on top, then unfound ones, then found ones.
      zIndex={selected ? 3 : found ? 1 : 2}
      anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
      onClick={onSelect}
    >
      <MapPin found={found} selected={selected} hoverable />
    </AdvancedMarker>
  )
}

// "You are here": an ink dot with a white ring and the pin shadow. Not
// blue, since Focus Blue only ever means keyboard focus (DESIGN.md).
function PositionMarker({ position }) {
  return (
    <AdvancedMarker position={position} zIndex={5} anchorPoint={AdvancedMarkerAnchorPoint.CENTER}>
      <span aria-hidden="true" className="block size-4 rounded-full bg-text-primary shadow-pin ring-3 ring-bg-surface" />
    </AdvancedMarker>
  )
}

// The × that puts away the popup or the phone card. 40px to tap, pulled
// into the corner with negative margins so it doesn't push the title down.
function CloseButton({ onClose }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className={`-m-2 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-secondary hover:text-text-primary ${FOCUS_RING}`}
    >
      <X aria-hidden="true" size={20} />
    </button>
  )
}

// Desktop: the small popup beside the selected pin. It hangs from the pin's
// spot by its bottom-left corner; the transparent padding moves it up and to
// the right, clear of the 40px selected pin (as in Figma), and lets clicks
// through so it never blocks the pin underneath. Its heading takes focus
// when it opens (tabIndex -1), so keyboard and screen-reader users land in it.
function PinPopup({ cache, position, onClose }) {
  return (
    <AdvancedMarker position={position} zIndex={4} anchorPoint={AdvancedMarkerAnchorPoint.LEFT_BOTTOM}>
      <div className="pointer-events-none hidden pb-8 pl-[1.875rem] lg:block">
        <section
          data-selection
          aria-labelledby="pin-popup-title"
          className="pointer-events-auto flex w-[260px] flex-col gap-3 rounded-2xl bg-bg-surface p-4 shadow-overlay contrast-more:border contrast-more:border-border-input"
        >
          <div className="flex items-start justify-between gap-2">
            <h2
              id="pin-popup-title"
              tabIndex={-1}
              className={`min-w-0 wrap-break-word rounded-sm text-body-strong text-text-primary ${FOCUS_RING}`}
            >
              {cache.title}
            </h2>
            <CloseButton onClose={onClose} />
          </div>
          <DifficultyMeter level={cache.difficulty} />
          <Button to={`/caches/${cache.id}`} fullWidth>
            View cache
          </Button>
        </section>
      </div>
    </AdvancedMarker>
  )
}

// Phones: the card for the selected pin, under the map (the map shrinks to
// make room, so Google's logo and terms stay visible above it). Its shadow is
// the Overlay shadow turned upward, since it rises from below.
function SelectedCacheCard({ cache, found, signedIn, onClose }) {
  return (
    <section
      data-selection
      aria-labelledby="selected-cache-title"
      className="relative z-20 flex flex-col gap-3 rounded-t-2xl bg-bg-surface px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-6px_20px_0_rgb(23_27_24/0.14)] contrast-more:border-t contrast-more:border-border-input lg:hidden"
    >
      <div className="flex items-start justify-between gap-3">
        <h2
          id="selected-cache-title"
          tabIndex={-1}
          className={`min-w-0 wrap-break-word rounded-sm text-heading text-text-primary ${FOCUS_RING}`}
        >
          {cache.title}
        </h2>
        <CloseButton onClose={onClose} />
      </div>
      <div className="flex items-center justify-between gap-4">
        {cache.location_name && (
          <p className="min-w-0 wrap-anywhere text-small text-text-secondary">{placeName(cache.location_name)}</p>
        )}
        <DifficultyMeter level={cache.difficulty} className="shrink-0" />
      </div>
      {/* Only logged-in people have finds, so the status is only shown to them. */}
      {signedIn &&
        (found ? (
          <div className="flex">
            <FoundTag />
          </div>
        ) : (
          <p className="text-small text-text-secondary">You haven’t found it yet</p>
        ))}
      <Button to={`/caches/${cache.id}`} fullWidth>
        View cache
      </Button>
    </section>
  )
}

// What "Show my location" says when it can't show anything.
const LOCATION_MESSAGES = {
  denied: 'Location is off for this site. You can allow it in your browser’s settings.',
  unavailable: 'Your location isn’t available right now. Try again in a moment.',
}

// The buttons in the map's bottom-right corner, above Google's terms line:
// show my location, back to campus, and (desktop only; phones pinch) zoom.
function MapControls({ locationStatus, onLocate, onCampus, onZoom }) {
  const message = LOCATION_MESSAGES[locationStatus]
  return (
    <div className="absolute bottom-8 right-4 z-10 flex flex-col items-end gap-2 lg:right-6">
      {message && (
        <p role="status" className="max-w-[16rem] rounded-lg bg-bg-surface px-3 py-2 text-small text-text-primary shadow-overlay">
          {message}
        </p>
      )}
      <button
        type="button"
        onClick={onLocate}
        aria-label="Show my location"
        title="Show my location"
        aria-busy={locationStatus === 'locating' || undefined}
        className={`${MAP_BUTTON} ${locationStatus === 'locating' ? 'cursor-wait' : ''}`}
      >
        <LocateFixed aria-hidden="true" size={20} className={locationStatus === 'locating' ? 'motion-safe:animate-pulse' : ''} />
      </button>
      <button type="button" onClick={onCampus} aria-label="Back to campus" title="Back to campus" className={MAP_BUTTON}>
        <School aria-hidden="true" size={20} />
      </button>
      <div className="hidden flex-col overflow-hidden rounded-lg border border-border-strong bg-bg-surface lg:flex">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => onZoom(1)}
          className={`flex size-10 cursor-pointer items-center justify-center border-b border-border-subtle text-text-primary hover:bg-bg-subtle ${FOCUS_RING}`}
        >
          <Plus aria-hidden="true" size={18} />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => onZoom(-1)}
          className={`flex size-10 cursor-pointer items-center justify-center text-text-primary hover:bg-bg-subtle ${FOCUS_RING}`}
        >
          <Minus aria-hidden="true" size={18} />
        </button>
      </div>
    </div>
  )
}

function MapPage() {
  const { caches, foundIds, userId, cacheLoading, dataError, authError, realtimeStatus, retry } = useMapData()
  const myLocation = useMyLocation()
  const isDesktop = useIsDesktop()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = readSearch(searchParams)
  // replace: typing doesn't add a history entry per letter.
  const setSearch = (text) => setSearchParams((current) => withSearch(current, text), { replace: true })
  const [filter, setFilter] = useState('all')
  // Nothing is selected until someone picks a pin or a card.
  const [selectedId, setSelectedId] = useState(null)
  // Phones only: the map, or the list instead of it.
  const [phoneView, setPhoneView] = useState('map')
  const [mapFailed, setMapFailed] = useState(false)
  // The Google map itself, for moving it from buttons and the list.
  const [map, setMap] = useState(null)
  // Where focus was before a cache was opened, to go back to on close.
  const openerRef = useRef(null)
  // Bumped each time a cache is opened, so its popup or card takes focus.
  const [focusRequest, setFocusRequest] = useState(0)

  const signedIn = Boolean(userId)
  const mapReady = Boolean(GOOGLE_MAPS_API_KEY) && !mapFailed
  // On phones the list replaces the map when there's no map or "List" is on.
  const phoneList = !mapReady || phoneView === 'list'
  // Search and filters float over the map on phones showing the map.
  const floating = mapReady && !phoneList
  // Filters are only for logged-in people, so everyone else sees every cache.
  const activeFilter = signedIn ? filter : 'all'
  const visibleCaches = useMemo(
    () => filterCaches(caches, search, activeFilter, foundIds),
    [caches, search, activeFilter, foundIds],
  )
  // If the selected cache is filtered out, nothing is selected.
  const selectedCache = visibleCaches.find((cache) => cache.id === selectedId) ?? null
  const selectedPosition = selectedCache ? cacheCoordinates(selectedCache) : null

  // If Google rejects the key (wrong, expired or not allowed on this site),
  // it doesn't report a loading error: it calls window.gm_authFailure and
  // covers the map with its own "Oops!" message. Switch to the list instead,
  // so phones can still pick a cache.
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return
    window.gm_authFailure = () => setMapFailed(true)
    return () => {
      delete window.gm_authFailure
    }
  }, [])

  // When a cache opens, move focus to its popup (desktop) or card (phones),
  // so keyboard and screen-reader users land on it. Google draws the popup a
  // moment later, so this waits for it (up to about a quarter second).
  useEffect(() => {
    if (!focusRequest) return
    const id = isDesktop ? 'pin-popup-title' : 'selected-cache-title'
    let frame
    let tries = 0
    const tryFocus = () => {
      const heading = document.getElementById(id)
      if (heading) heading.focus({ preventScroll: true })
      else if (tries++ < 15) frame = requestAnimationFrame(tryFocus)
    }
    frame = requestAnimationFrame(tryFocus)
    return () => cancelAnimationFrame(frame)
  }, [focusRequest, isDesktop])

  // Close the popup or card. If focus was inside it, put focus back where it
  // was before (the card in the list, or the pin).
  function closeSelection() {
    const active = document.activeElement
    const focusInside = active === document.body || Boolean(active?.closest('[data-selection]'))
    setSelectedId(null)
    if (focusInside && openerRef.current?.isConnected) openerRef.current.focus({ preventScroll: true })
  }

  // Escape closes it too. closeSelection only uses a state setter and a ref,
  // which never change, so it isn't listed as a dependency.
  useEffect(() => {
    if (!selectedId) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeSelection()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId])

  function openCache(cache) {
    openerRef.current = document.activeElement
    setSelectedId(cache.id)
    setFocusRequest((count) => count + 1)
  }

  // From a pin: the map stays where it is (you were already looking there);
  // on desktop, its card in the list scrolls into view.
  function selectFromPin(cache) {
    openCache(cache)
    requestAnimationFrame(() => {
      document.getElementById(`map-card-${cache.id}`)?.scrollIntoView({ block: 'nearest' })
    })
  }

  // From the list: bring the map to the cache, zooming in if it's far out.
  function selectFromList(cache) {
    openCache(cache)
    const position = cacheCoordinates(cache)
    if (map && position) {
      map.panTo(position)
      if ((map.getZoom() ?? 0) < CLOSE_ZOOM) map.setZoom(CLOSE_ZOOM)
    }
  }

  function zoom(step) {
    if (map) map.setZoom(Math.min(20, Math.max(3, (map.getZoom() ?? CAMPUS_ZOOM) + step)))
  }

  function backToCampus() {
    if (!map) return
    map.panTo(CAMPUS_CENTER)
    map.setZoom(CAMPUS_ZOOM)
  }

  function showMyLocation() {
    myLocation.locate((position) => {
      if (!map) return
      map.panTo(position)
      if ((map.getZoom() ?? 0) < CLOSE_ZOOM) map.setZoom(CLOSE_ZOOM)
    })
  }

  // Only say something about live updates when they've stopped working.
  const realtimeUnavailable = signedIn && realtimeStatus === 'polling'
  const liveMessage = realtimeUnavailable ? 'Live updates are off right now. The map still refreshes every 30 seconds.' : ''

  // Shown instead of the list (and on top of the map on phones) when there's
  // nothing to list.
  let emptyNotice = null
  if (visibleCaches.length === 0 && !dataError) {
    if (cacheLoading) emptyNotice = 'Loading caches…'
    else if (caches.length === 0) emptyNotice = 'There are no caches on the map yet.'
    else emptyNotice = 'No caches match. Try a different search or filter.'
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg-page text-text-primary">
      <title>Map · HuskyCache</title>
      {/* Hidden until someone presses Tab, so keyboard users can jump past the header. */}
      <a
        href="#main-content"
        className={`sr-only rounded-lg bg-bg-surface px-4 py-2 text-label text-text-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 ${FOCUS_RING}`}
      >
        Skip to content
      </a>
      <SiteHeader />

      {/* The page's own <main> (Layout leaves it out here), with the header outside it. */}
      <main id="main-content" tabIndex={-1} className="relative flex min-h-0 flex-1 outline-none">
        {/* Heading, search, filters and the list. Phones showing the map:
            search and filters float over the top of it (the gaps let the map
            be dragged). Phones showing the list: it fills the screen.
            Desktop: a 400px panel on the left. */}
        <div
          className={`flex flex-col gap-3 ${
            floating
              ? 'absolute inset-x-0 top-0 z-10 p-4 max-lg:pointer-events-none max-lg:*:pointer-events-auto'
              : 'min-w-0 flex-1 overflow-y-auto p-4'
          } lg:pointer-events-auto lg:static lg:w-[400px] lg:flex-none lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-border-subtle lg:p-6 lg:contrast-more:border-border-input`}
        >
          {/* The page heading, set like a place label. Over the phone map
              there's no room for it, so there it's for screen readers only. */}
          <h1 className={`text-display text-text-primary lg:text-title ${floating ? 'max-lg:sr-only' : ''}`}>
            Caches near campus
          </h1>
          <SearchField value={search} onChange={setSearch} />
          {(signedIn || mapReady) && (
            <div className="flex items-center gap-2">
              {signedIn && <FilterChips value={activeFilter} onChange={setFilter} />}
              {/* Phones with a map: swap between the map and the list. */}
              {mapReady && (
                <button
                  type="button"
                  onClick={() => setPhoneView(phoneList ? 'map' : 'list')}
                  className={`${chipClass(false)} ml-auto lg:hidden`}
                >
                  {phoneList ? <MapIcon aria-hidden="true" size={16} /> : <List aria-hidden="true" size={16} />}
                  {phoneList ? 'Map' : 'List'}
                </button>
              )}
            </div>
          )}

          {dataError && (
            <Notice role="alert">
              {dataError}{' '}
              <button
                type="button"
                onClick={retry}
                className={`cursor-pointer rounded-sm font-bold text-text-primary underline underline-offset-4 ${FOCUS_RING}`}
              >
                Try again
              </button>
            </Notice>
          )}
          {!mapReady && (
            <p className="text-balance text-small text-text-secondary lg:hidden">
              {mapUnavailableText(mapFailed)} Here’s the list instead.
            </p>
          )}
          {emptyNotice && <Notice>{emptyNotice}</Notice>}

          {/* The list: always on desktop, and on phones when it's showing. */}
          <div className={`flex-col gap-3 ${phoneList ? 'flex' : 'hidden lg:flex'}`}>
            {visibleCaches.length > 0 && (
              <p className="text-label text-text-secondary">
                {countText(visibleCaches.length, activeFilter, Boolean(search.trim()))}
              </p>
            )}
            {authError && (
              <p className="text-small text-text-secondary">
                We couldn’t check whether you’re logged in, so your finds aren’t shown.
              </p>
            )}
            <ol className="flex flex-col gap-3">
              {visibleCaches.map((cache) => {
                const found = foundIds.includes(cache.id)
                // A card selects its pin on the desktop map. Everywhere else
                // (the phone list, no map, no coordinates) it opens the cache.
                const selects = mapReady && isDesktop && Boolean(cacheCoordinates(cache))
                return (
                  <li key={cache.id} id={`map-card-${cache.id}`}>
                    <CacheCard
                      title={cache.title}
                      location={placeName(cache.location_name)}
                      difficulty={cache.difficulty}
                      found={found}
                      selected={selects && cache.id === selectedCache?.id}
                      {...(selects ? { onClick: () => selectFromList(cache) } : { to: `/caches/${cache.id}` })}
                    />
                  </li>
                )
              })}
            </ol>
          </div>
        </div>

        {/* The map, with the phone card under it. On phones showing the
            list, this is left out; on desktop without a map it says why. */}
        <section
          aria-label="Map of caches"
          className={`min-w-0 flex-1 flex-col bg-bg-subtle ${phoneList ? 'hidden lg:flex' : 'flex'}`}
        >
          <div className="relative min-h-0 flex-1">
            {mapReady ? (
              <APIProvider apiKey={GOOGLE_MAPS_API_KEY} onError={() => setMapFailed(true)}>
                <GoogleMap
                  className="size-full"
                  mapId="DEMO_MAP_ID"
                  defaultCenter={CAMPUS_CENTER}
                  defaultZoom={CAMPUS_ZOOM}
                  gestureHandling="greedy"
                  disableDefaultUI
                  clickableIcons={false}
                >
                  <MapHandle onMap={setMap} />
                  {visibleCaches.map((cache) => {
                    const position = cacheCoordinates(cache)
                    if (!position) return null
                    const found = foundIds.includes(cache.id)
                    return (
                      <CachePinMarker
                        key={cache.id}
                        cache={cache}
                        position={position}
                        found={found}
                        selected={cache.id === selectedCache?.id}
                        signedIn={signedIn}
                        onSelect={() => selectFromPin(cache)}
                      />
                    )
                  })}
                  {myLocation.position && <PositionMarker position={myLocation.position} />}
                  {selectedCache && selectedPosition && (
                    <PinPopup cache={selectedCache} position={selectedPosition} onClose={closeSelection} />
                  )}
                </GoogleMap>
              </APIProvider>
            ) : (
              <div className="flex size-full items-center justify-center p-6">
                <div className="max-w-sm text-center">
                  <p className="text-body-strong text-text-primary">The map isn’t available</p>
                  <p className="mt-1 text-balance text-small text-text-secondary">
                    {mapUnavailableText(mapFailed)} Pick a cache from the list instead.
                  </p>
                </div>
              </div>
            )}

            {liveMessage && (
              <p className="absolute right-6 top-6 z-10 hidden max-w-[240px] rounded-lg bg-bg-surface px-3 py-2 text-small text-text-secondary shadow-overlay lg:block">
                {liveMessage}
              </p>
            )}
            {mapReady && (
              <MapControls
                locationStatus={myLocation.status}
                onLocate={showMyLocation}
                onCampus={backToCampus}
                onZoom={zoom}
              />
            )}
          </div>

          {mapReady && selectedCache && (
            <SelectedCacheCard
              cache={selectedCache}
              found={foundIds.includes(selectedCache.id)}
              signedIn={signedIn}
              onClose={closeSelection}
            />
          )}
        </section>
      </main>

      {/* Read out to screen readers: only when something stops working. */}
      <span className="sr-only" aria-live="polite">
        {liveMessage}
      </span>
    </div>
  )
}

export default MapPage
