import { APIProvider, AdvancedMarker, Map as GoogleMap } from '@vis.gl/react-google-maps'
import { Check, MapPin, Minus, Plus, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import DifficultyMeter from '../components/DifficultyMeter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { supabase } from '../lib/supabaseClient.js'
import {
  filterCaches,
  loadActiveCaches,
  loadUserFinds,
  subscribeToUserFindChanges,
} from './mapData.js'

const CAMPUS_CENTER = { lat: 42.3398, lng: -71.0892 }
const REFRESH_INTERVAL_MS = 30_000
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'to-find', label: 'To find' },
  { id: 'my-finds', label: 'My finds' },
]

function FoundTag() {
  return (
    <span className="inline-flex shrink-0 items-center gap-[5px] border border-black px-[10px] py-[2px] text-[12px] font-bold leading-[17px] text-black">
      <Check aria-hidden="true" size={11} strokeWidth={3} />
      Found by you
    </span>
  )
}

function CacheCard({ cache, isFound, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={[
        'flex w-full flex-col items-start gap-2 overflow-hidden p-[14px] text-left transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8102e]',
        isSelected ? 'border-2 border-black bg-[#f5f5f5]' : 'border border-black bg-white hover:bg-[#fafafa]',
      ].join(' ')}
    >
      <span className="flex w-full items-start justify-between gap-3">
        <span className="min-w-0 flex-1 text-[15px] font-bold leading-[21px] text-black">
          {cache.title}
        </span>
        {isFound && <FoundTag />}
      </span>
      <span className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] leading-[18px] text-[#444]">
        {cache.location_name && <span>{cache.location_name}</span>}
        <DifficultyMeter difficulty={cache.difficulty} />
      </span>
    </button>
  )
}

function MapPinMarker({ cache, isFound, isSelected, onSelect }) {
  const position = {
    lat: Number(cache.latitude),
    lng: Number(cache.longitude),
  }

  if (
    !Number.isFinite(position.lat) ||
    !Number.isFinite(position.lng) ||
    Math.abs(position.lat) > 90 ||
    Math.abs(position.lng) > 180
  ) {
    return null
  }

  return (
    <AdvancedMarker
      position={position}
      title={cache.title}
      zIndex={isSelected ? 2 : 1}
      onClick={onSelect}
    >
      <span
        className={[
          'relative flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-sm',
          isSelected
            ? 'border-[#c8102e] bg-[#c8102e] text-white'
            : isFound
              ? 'border-black bg-black text-white'
              : 'border-black bg-white text-black',
        ].join(' ')}
      >
        {isFound ? (
          <Check aria-hidden="true" size={17} strokeWidth={3} />
        ) : (
          <MapPin aria-hidden="true" size={19} strokeWidth={2.5} />
        )}
      </span>
    </AdvancedMarker>
  )
}

function MapFallback({ hasKey, failed }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f5] px-6 text-center">
      <div className="max-w-[360px]">
        <MapPin aria-hidden="true" className="mx-auto mb-3 text-[#444]" size={28} />
        <p className="text-[15px] font-bold text-black">Map unavailable</p>
        <p className="mt-2 text-[13px] leading-5 text-[#444]">
          {failed
            ? 'Google Maps could not be loaded. Check the browser configuration and try again.'
            : hasKey
              ? 'Google Maps could not be initialized.'
              : 'Configure VITE_GOOGLE_MAPS_API_KEY to show the live map.'}
        </p>
      </div>
    </div>
  )
}

function MapPage() {
  const [caches, setCaches] = useState([])
  const [foundIds, setFoundIds] = useState([])
  const [userId, setUserId] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selectedCacheId, setSelectedCacheId] = useState(null)
  const [cacheLoading, setCacheLoading] = useState(true)
  const [dataError, setDataError] = useState('')
  const [authError, setAuthError] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState('connecting')
  const [mapFailed, setMapFailed] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [camera, setCamera] = useState({
    center: CAMPUS_CENTER,
    zoom: 15,
  })

  // Filters are only for logged-in users (per the design), so logged-out
  // visitors always see every cache.
  const activeFilter = userId ? filter : 'all'
  const visibleCaches = useMemo(
    () => filterCaches(caches, search, activeFilter, foundIds),
    [caches, search, activeFilter, foundIds],
  )
  const selectedCache =
    visibleCaches.find((cache) => cache.id === selectedCacheId) ?? visibleCaches[0] ?? null
  const cacheCount = caches.length

  useEffect(() => {
    let active = true
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
    })

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          throw error
        }
        if (active) {
          setUserId(data.session?.user?.id ?? null)
          setAuthError(false)
        }
      })
      .catch(() => {
        if (active) {
          setUserId(null)
          setAuthError(true)
        }
      })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let active = true
    let refreshing = false
    let debounceTimer

    const refresh = async () => {
      if (refreshing) {
        return
      }

      refreshing = true
      try {
        const [nextCaches, nextFoundIds] = await Promise.all([
          loadActiveCaches(supabase),
          loadUserFinds(supabase, userId),
        ])

        if (active) {
          setCaches(nextCaches)
          setFoundIds(nextFoundIds)
          setDataError('')
        }
      } catch {
        if (active) {
          setDataError('Map data could not be loaded. Check Supabase read access and retry.')
        }
      } finally {
        refreshing = false
        if (active) {
          setCacheLoading(false)
        }
      }
    }

    const scheduleRefresh = () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        void refresh()
      }, 250)
    }

    const channel = subscribeToUserFindChanges(
      supabase,
      userId,
      scheduleRefresh,
      (status) => {
        if (!active) {
          return
        }
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('live')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRealtimeStatus('polling')
        }
      },
    )
    const intervalId = setInterval(() => {
      void refresh()
    }, REFRESH_INTERVAL_MS)

    void refresh()

    return () => {
      active = false
      clearTimeout(debounceTimer)
      clearInterval(intervalId)
      if (channel) {
        void supabase.removeChannel(channel)
      }
    }
  }, [userId, retryCount])

  const selectCache = useCallback((cache) => {
    setSelectedCacheId(cache.id)
    const center = {
      lat: Number(cache.latitude),
      lng: Number(cache.longitude),
    }
    if (
      Number.isFinite(center.lat) &&
      Number.isFinite(center.lng) &&
      Math.abs(center.lat) <= 90 &&
      Math.abs(center.lng) <= 180
    ) {
      setCamera((current) => ({ center, zoom: Math.max(current.zoom, 16) }))
    }
  }, [])

  const selectFilter = (filterId) => {
    setFilter(filterId)
  }

  const renderFilters = (mobile = false) => userId && (
    <div className={`flex gap-2 ${mobile ? 'overflow-x-auto' : ''}`} role="group" aria-label="Filter caches">
      {FILTERS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          aria-pressed={activeFilter === id}
          onClick={() => selectFilter(id)}
          className={[
            'h-8 shrink-0 border px-[14px] text-[13px] font-bold leading-[18px] transition-colors',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8102e]',
            activeFilter === id ? 'border-black bg-black text-white' : 'border-black bg-white text-black hover:bg-[#f5f5f5]',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )

  const renderSearch = (mobile = false) => (
    <label className="flex h-12 w-full items-center gap-3 border border-black bg-white px-4">
      <Search aria-hidden="true" size={18} className="shrink-0 text-[#444]" />
      <span className="sr-only">Search caches or places</span>
      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search caches or places"
        className="min-w-0 flex-1 bg-transparent text-[15px] font-medium leading-[21px] text-black outline-none placeholder:text-[#444]"
      />
      {search && (
        <button
          type="button"
          onClick={() => setSearch('')}
          aria-label="Clear search"
          className="text-[#444] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8102e]"
        >
          <X aria-hidden="true" size={16} />
        </button>
      )}
      {mobile && <span className="sr-only">Results update as you type</span>}
    </label>
  )

  const realtimeUnavailable = Boolean(userId) && realtimeStatus === 'polling'
  const liveStatus = !userId
    ? 'Active caches refresh every 30 seconds.'
    : realtimeStatus === 'live'
      ? 'Your finds update live; active caches refresh every 30 seconds.'
      : realtimeUnavailable
        ? 'Live find updates unavailable; all data refreshes every 30 seconds.'
        : 'Connecting to live find updates; active caches refresh every 30 seconds.'

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-white text-black">
      <SiteHeader />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[400px] shrink-0 flex-col gap-[14px] overflow-y-auto border-r border-black bg-white p-6 md:flex">
          {renderSearch()}
          {renderFilters()}

          <p className="text-[13px] font-bold leading-[18px] text-[#444]">
            {cacheCount} active {cacheCount === 1 ? 'cache' : 'caches'}
          </p>

          {dataError && (
            <div className="border border-[#c8102e] bg-white p-3 text-[13px] leading-5" role="alert">
              <p>{dataError}</p>
              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="mt-2 font-bold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8102e]"
              >
                Try again
              </button>
            </div>
          )}

          {authError && (
            <p className="text-[13px] leading-5 text-[#444]" role="status">
              Sign-in status is unavailable; personal finds are hidden.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {visibleCaches.map((cache) => (
              <CacheCard
                key={cache.id}
                cache={cache}
                isFound={foundIds.includes(cache.id)}
                isSelected={cache.id === selectedCache?.id}
                onSelect={() => selectCache(cache)}
              />
            ))}
            {visibleCaches.length === 0 && (
              <p className="border border-[#d4d4d4] p-4 text-[13px] leading-5 text-[#444]" role="status">
                {cacheLoading
                  ? 'Loading caches…'
                  : caches.length === 0
                    ? 'No active caches are visible. Check that Supabase read access is configured.'
                    : 'No caches match this search and filter.'}
              </p>
            )}
          </div>
        </aside>

        <section className="relative min-w-0 flex-1 overflow-hidden bg-[#f5f5f5]" aria-label="Cache map">
          {GOOGLE_MAPS_API_KEY && !mapFailed ? (
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY} onError={() => setMapFailed(true)}>
              <GoogleMap
                className="h-full w-full"
                mapId="DEMO_MAP_ID"
                center={camera.center}
                zoom={camera.zoom}
                onCameraChanged={(event) => setCamera(event.detail)}
                gestureHandling="greedy"
                disableDefaultUI
              >
                {visibleCaches.map((cache) => (
                  <MapPinMarker
                    key={cache.id}
                    cache={cache}
                    isFound={foundIds.includes(cache.id)}
                    isSelected={cache.id === selectedCache?.id}
                    onSelect={() => selectCache(cache)}
                  />
                ))}
              </GoogleMap>
            </APIProvider>
          ) : (
            <MapFallback hasKey={Boolean(GOOGLE_MAPS_API_KEY)} failed={mapFailed} />
          )}

          <div className="absolute right-4 top-[136px] z-10 md:right-6 md:top-6">
            {realtimeUnavailable && (
              <p className="max-w-[220px] border border-black bg-white px-3 py-2 text-[12px] leading-4 shadow-sm" role="status">
                {liveStatus}
              </p>
            )}
            {dataError && (
              <p className="mt-2 max-w-[220px] border border-[#c8102e] bg-white px-3 py-2 text-[12px] leading-4 shadow-sm" role="alert">
                {dataError}
              </p>
            )}
          </div>

          {GOOGLE_MAPS_API_KEY && !mapFailed && (
            <div className="absolute bottom-[270px] right-4 z-10 flex flex-col border border-black bg-white md:bottom-6 md:right-6">
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => setCamera((current) => ({ ...current, zoom: Math.min(20, current.zoom + 1) }))}
                className="flex size-10 items-center justify-center border-b border-black hover:bg-[#f5f5f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#c8102e]"
              >
                <Plus aria-hidden="true" size={18} />
              </button>
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => setCamera((current) => ({ ...current, zoom: Math.max(3, current.zoom - 1) }))}
                className="flex size-10 items-center justify-center hover:bg-[#f5f5f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#c8102e]"
              >
                <Minus aria-hidden="true" size={18} />
              </button>
            </div>
          )}

          {selectedCache && (
            <section className="absolute left-6 top-6 z-10 hidden w-[320px] border border-black bg-white p-4 shadow-sm md:block" aria-label="Selected cache">
              <h2 className="text-[18px] font-extrabold leading-6">{selectedCache.title}</h2>
              {selectedCache.location_name && (
                <p className="mt-1 text-[13px] leading-[18px] text-[#444]">{selectedCache.location_name}</p>
              )}
              <div className="mt-3 flex items-center justify-between gap-3">
                <DifficultyMeter difficulty={selectedCache.difficulty} />
                {foundIds.includes(selectedCache.id) ? (
                  <FoundTag />
                ) : (
                  <span className="text-[13px] font-medium text-[#444]">Not found yet</span>
                )}
              </div>
              <Link
                to={`/caches/${selectedCache.id}`}
                className="mt-4 flex h-12 items-center justify-center bg-black text-[15px] font-bold text-white hover:bg-[#333] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8102e]"
              >
                View cache
              </Link>
            </section>
          )}

          <div className="absolute left-4 right-4 top-4 z-10 flex flex-col gap-2 md:hidden">
            {renderSearch(true)}
            {renderFilters(true)}
          </div>

          <section className="absolute inset-x-0 bottom-0 z-10 flex max-h-[34%] min-h-[214px] flex-col gap-3 overflow-y-auto rounded-t-[16px] border-t border-black bg-white px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[10px] shadow-[0_-2px_16px_rgba(0,0,0,0.12)] md:hidden" aria-label="Selected cache preview">
            <div className="flex w-full justify-center" aria-hidden="true">
              <span className="h-1 w-9 bg-[#f5f5f5]" />
            </div>
            {selectedCache ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 flex-1 text-[20px] font-extrabold leading-7">
                    {selectedCache.title}
                  </h2>
                  {foundIds.includes(selectedCache.id) && <FoundTag />}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-[14px] font-medium leading-5 text-[#444]">
                    {selectedCache.location_name || 'Location not set'}
                  </p>
                  <DifficultyMeter difficulty={selectedCache.difficulty} />
                </div>
                {!foundIds.includes(selectedCache.id) && (
                  <p className="text-[13px] leading-[18px] text-[#444]">You haven’t found it yet</p>
                )}
                <Link
                  to={`/caches/${selectedCache.id}`}
                  className="flex h-12 shrink-0 items-center justify-center bg-black text-[15px] font-bold text-white hover:bg-[#333] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8102e]"
                >
                  View cache
                </Link>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center" role="status">
                <p className="text-[15px] font-bold">
                  {cacheLoading ? 'Loading caches…' : 'No cache selected'}
                </p>
                <p className="mt-2 max-w-[290px] text-[13px] leading-5 text-[#444]">
                  {dataError ||
                    (cacheCount === 0
                      ? 'No active caches are visible. Check that Supabase read access is configured.'
                      : 'Try a different search or filter.')}
                </p>
              </div>
            )}
          </section>
        </section>
      </div>
      <span className="sr-only" aria-live="polite">
        {liveStatus}
      </span>
    </div>
  )
}

export default MapPage
