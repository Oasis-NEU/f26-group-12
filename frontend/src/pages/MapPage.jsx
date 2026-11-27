import { APIProvider, AdvancedMarker, AdvancedMarkerAnchorPoint, Map as GoogleMap } from '@vis.gl/react-google-maps'
import { Minus, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Button from '../components/Button.jsx'
import CacheCard, { FoundTag } from '../components/CacheCard.jsx'
import DifficultyMeter from '../components/DifficultyMeter.jsx'
import { FOCUS_RING } from '../components/focusRing.js'
import MapPin from '../components/MapPin.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { useMapData } from '../lib/useMapData.js'
import { cacheCoordinates } from './cacheDetail/coords.js'
import { filterCaches } from './mapData.js'

// The map of caches, the home page (/). From the Figma section "Map · /".
//
// Phones (the base styles): the map fills the screen, with search and the
// filters floating on top. Tapping a pin brings up a card for that cache at
// the bottom of the screen.
// Desktop (lg:): the list of caches moves into a panel on the left. Clicking
// a pin highlights its card in the list and opens a small popup beside the
// pin instead of the bottom card.
//
// The data (caches, your finds, who's signed in) comes from useMapData in
// src/lib; this file only decides how to show it.

const CAMPUS_CENTER = { lat: 42.3398, lng: -71.0892 }
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'to-find', label: 'To find' },
  { id: 'my-finds', label: 'My finds' },
]

// Hiders often type the location lowercase ("near Snell Library"), so show
// it with a capital first letter. The saved text isn't changed.
function placeName(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : ''
}

// The line above the list: how many caches are showing, in the filter's words.
function countText(count, filter, searching) {
  const caches = count === 1 ? 'cache' : 'caches'
  if (searching) return count === 1 ? '1 match' : `${count} matches`
  if (filter === 'to-find') return `${count} ${caches} to find`
  if (filter === 'my-finds') return `${count} ${caches} found by you`
  return `${count} ${caches} near campus`
}

// The search box. It has no visible label (as in Figma), so screen readers
// get one instead. Our own clear button replaces the browser's, which looks
// different in every browser.
function SearchField({ value, onChange }) {
  return (
    <div className="relative w-full">
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

// All / To find / My finds. Only shown to logged-in people: the other two
// need to know what you've found. The selected chip is the dark Inverse fill.
function FilterChips({ value, onChange }) {
  return (
    <div role="group" aria-label="Show caches" className="flex gap-2">
      {FILTERS.map(({ id, label }) => {
        const selected = value === id
        return (
          <button
            key={id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(id)}
            className={`h-8 shrink-0 cursor-pointer rounded-lg border px-3.5 text-label ${
              selected
                ? 'border-bg-inverse bg-bg-inverse text-text-on-accent'
                : 'border-border-strong bg-bg-surface text-text-primary hover:bg-bg-subtle'
            } ${FOCUS_RING}`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// A short message in a white box, for loading, empty and error states.
function Notice({ role = 'status', children }) {
  return (
    <div
      role={role}
      className="rounded-2xl border border-border-subtle bg-bg-surface p-4 text-small text-text-secondary contrast-more:border-border-input"
    >
      {children}
    </div>
  )
}

// Why the map isn't showing. failed: Google Maps tried and couldn't load.
function mapUnavailableText(failed) {
  return failed
    ? 'Google Maps couldn’t load right now.'
    : 'The map isn’t set up here yet.'
}

// One cache on the map: our MapPin (red to find, green once found, bigger
// with a gold ring when selected), centred on the cache's spot. The marker
// is the clickable part, so the pin only adds the hover grow.
function CachePinMarker({ cache, position, found, selected, onSelect }) {
  return (
    <AdvancedMarker
      position={position}
      // Google uses the title as the pin's name for screen readers.
      title={found ? `${cache.title}, found by you` : cache.title}
      // The selected pin sits on top, then unfound ones, then found ones.
      zIndex={selected ? 3 : found ? 1 : 2}
      anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
      onClick={onSelect}
    >
      <MapPin found={found} selected={selected} hoverable />
    </AdvancedMarker>
  )
}

// Desktop: the small popup beside the selected pin. It hangs from the pin's
// spot by its bottom-left corner; the transparent padding moves it up and to
// the right, clear of the 40px selected pin (as in Figma). The padding lets
// clicks through, so it never blocks the pin underneath.
function PinPopup({ cache, position, onClose }) {
  return (
    <AdvancedMarker position={position} zIndex={4} anchorPoint={AdvancedMarkerAnchorPoint.LEFT_BOTTOM}>
      <div className="pointer-events-none hidden pb-8 pl-[1.875rem] lg:block">
        <section
          aria-labelledby="pin-popup-title"
          className="pointer-events-auto flex w-[260px] flex-col gap-3 rounded-2xl bg-bg-surface p-4 shadow-overlay contrast-more:border contrast-more:border-border-input"
        >
          <div className="flex items-start justify-between gap-2">
            <h2 id="pin-popup-title" className="min-w-0 wrap-break-word text-body-strong text-text-primary">
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

// Phones: the card for the selected pin, along the bottom of the screen.
// Its shadow is the Overlay shadow turned upward, since it rises from below.
function SelectedCacheCard({ cache, found, signedIn, onClose }) {
  return (
    <section
      aria-labelledby="selected-cache-title"
      className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-3 rounded-t-2xl bg-bg-surface px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-6px_20px_0_rgb(23_27_24/0.14)] contrast-more:border-t contrast-more:border-border-input lg:hidden"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="selected-cache-title" className="min-w-0 wrap-break-word text-heading text-text-primary">
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

// Desktop: + and − in the map's bottom-right corner. Phones pinch to zoom.
function ZoomControls({ onZoom }) {
  const button = `flex size-10 cursor-pointer items-center justify-center text-text-primary hover:bg-bg-subtle ${FOCUS_RING}`
  return (
    <div className="absolute bottom-6 right-6 z-10 hidden flex-col overflow-hidden rounded-lg border border-border-strong bg-bg-surface lg:flex">
      <button type="button" aria-label="Zoom in" onClick={() => onZoom(1)} className={`${button} border-b border-border-subtle`}>
        <Plus aria-hidden="true" size={18} />
      </button>
      <button type="button" aria-label="Zoom out" onClick={() => onZoom(-1)} className={button}>
        <Minus aria-hidden="true" size={18} />
      </button>
    </div>
  )
}

function MapPage() {
  const { caches, foundIds, userId, cacheLoading, dataError, authError, realtimeStatus, retry } = useMapData()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  // Nothing is selected until someone taps a pin or a card.
  const [selectedId, setSelectedId] = useState(null)
  const [mapFailed, setMapFailed] = useState(false)
  const [camera, setCamera] = useState({ center: CAMPUS_CENTER, zoom: 15 })

  const signedIn = Boolean(userId)
  const mapReady = Boolean(GOOGLE_MAPS_API_KEY) && !mapFailed
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

  // Escape closes the popup or card.
  useEffect(() => {
    if (!selectedId) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId])

  // Select a cache and bring the map to it (zooming in a little if needed).
  function selectCache(cache) {
    setSelectedId(cache.id)
    const position = cacheCoordinates(cache)
    if (position) setCamera((current) => ({ center: position, zoom: Math.max(current.zoom, 16) }))
  }

  // From a pin: also bring its card in the desktop list into view.
  function selectFromPin(cache) {
    selectCache(cache)
    requestAnimationFrame(() => {
      document.getElementById(`map-card-${cache.id}`)?.scrollIntoView({ block: 'nearest' })
    })
  }

  function zoom(step) {
    setCamera((current) => ({ ...current, zoom: Math.min(20, Math.max(3, current.zoom + step)) }))
  }

  // What screen readers hear about live updates (and the note shown on
  // desktop if live updates drop back to refreshing every 30 seconds).
  const realtimeUnavailable = signedIn && realtimeStatus === 'polling'
  const liveStatus = !signedIn
    ? 'Caches refresh every 30 seconds.'
    : realtimeStatus === 'live'
      ? 'Your finds update live; caches refresh every 30 seconds.'
      : realtimeUnavailable
        ? 'Live updates aren’t available right now, so the map refreshes every 30 seconds.'
        : 'Connecting to live updates; caches refresh every 30 seconds.'

  // Shown instead of the list (and on top of the map on phones) when there's
  // nothing to list.
  let emptyNotice = null
  if (visibleCaches.length === 0) {
    if (cacheLoading) emptyNotice = 'Loading caches…'
    else if (dataError) emptyNotice = null
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
        <h1 className="sr-only">Cache map</h1>

        {/* Search, filters and the list. Phones with a map: search and filters
            float over the top of the map (the gaps between them let the map be
            dragged). Phones without a map: the list fills the screen instead.
            Desktop: a 400px panel on the left. */}
        <div
          className={`flex flex-col gap-3 ${
            mapReady
              ? 'absolute inset-x-0 top-0 z-10 p-4 max-lg:pointer-events-none max-lg:*:pointer-events-auto'
              : 'min-w-0 flex-1 overflow-y-auto p-4'
          } lg:pointer-events-auto lg:static lg:w-[400px] lg:flex-none lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-border-subtle lg:p-6 lg:contrast-more:border-border-input`}
        >
          <SearchField value={search} onChange={setSearch} />
          {signedIn && <FilterChips value={activeFilter} onChange={setFilter} />}

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
            <p className="text-small text-text-secondary lg:hidden">{mapUnavailableText(mapFailed)} Here’s the list instead.</p>
          )}
          {emptyNotice && <Notice>{emptyNotice}</Notice>}

          {/* The list: always on desktop, and on phones only when there's no map. */}
          <div className={`flex-col gap-3 ${mapReady ? 'hidden lg:flex' : 'flex'}`}>
            {visibleCaches.length > 0 && (
              <p className="mt-1 text-label text-text-secondary">
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
                return (
                  <li key={cache.id} id={`map-card-${cache.id}`}>
                    {/* With a map, a card selects its pin. Without one, it opens the cache. */}
                    <CacheCard
                      title={cache.title}
                      location={placeName(cache.location_name)}
                      difficulty={cache.difficulty}
                      found={found}
                      selected={mapReady && cache.id === selectedCache?.id}
                      {...(mapReady ? { onClick: () => selectCache(cache) } : { to: `/caches/${cache.id}` })}
                    />
                  </li>
                )
              })}
            </ol>
          </div>
        </div>

        {/* The map. On phones without one, this area is left out (the list
            shows instead); on desktop it says why the map is missing. */}
        <section
          aria-label="Map of caches"
          className={`relative min-w-0 flex-1 bg-bg-subtle ${mapReady ? 'block' : 'hidden lg:block'}`}
        >
          {mapReady ? (
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY} onError={() => setMapFailed(true)}>
              <GoogleMap
                className="size-full"
                mapId="DEMO_MAP_ID"
                center={camera.center}
                zoom={camera.zoom}
                onCameraChanged={(event) => setCamera(event.detail)}
                gestureHandling="greedy"
                disableDefaultUI
                clickableIcons={false}
              >
                {visibleCaches.map((cache) => {
                  const position = cacheCoordinates(cache)
                  if (!position) return null
                  return (
                    <CachePinMarker
                      key={cache.id}
                      cache={cache}
                      position={position}
                      found={foundIds.includes(cache.id)}
                      selected={cache.id === selectedCache?.id}
                      onSelect={() => selectFromPin(cache)}
                    />
                  )
                })}
                {selectedCache && selectedPosition && (
                  <PinPopup cache={selectedCache} position={selectedPosition} onClose={() => setSelectedId(null)} />
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

          {realtimeUnavailable && (
            <p className="absolute right-6 top-6 z-10 hidden max-w-[240px] rounded-lg bg-bg-surface px-3 py-2 text-small text-text-secondary shadow-overlay lg:block">
              {liveStatus}
            </p>
          )}
          {mapReady && <ZoomControls onZoom={zoom} />}

          {mapReady && selectedCache && (
            <SelectedCacheCard
              cache={selectedCache}
              found={foundIds.includes(selectedCache.id)}
              signedIn={signedIn}
              onClose={() => setSelectedId(null)}
            />
          )}
        </section>
      </main>

      <span className="sr-only" aria-live="polite">
        {liveStatus}
      </span>
    </div>
  )
}

export default MapPage
