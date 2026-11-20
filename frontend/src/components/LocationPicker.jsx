import { APIProvider, AdvancedMarker, Map as GoogleMap } from '@vis.gl/react-google-maps'
import { MapPin } from 'lucide-react'
import { useState } from 'react'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const CAMPUS_CENTER = { lat: 42.3398, lng: -71.0892 }

// A map with one pin. Drag the pin (or tap the map) to move it; `onChange`
// gets the new { lat, lng }. The location only lives in the form until saved.
// `className` sets the height, e.g. "h-[180px] md:h-[360px]".
function LocationPicker({ position, onChange, className = '' }) {
  const [mapFailed, setMapFailed] = useState(false)
  const hasPin = Number.isFinite(position?.lat) && Number.isFinite(position?.lng)

  if (!GOOGLE_MAPS_API_KEY || mapFailed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 bg-[#f5f5f5] px-4 text-center ${className}`}
      >
        <p className="text-[13px] font-medium leading-[18px] text-[#444]">
          {mapFailed ? 'The map couldn’t load.' : 'Map unavailable: VITE_GOOGLE_MAPS_API_KEY isn’t set.'}
        </p>
        {hasPin && (
          <p className="text-[13px] font-medium leading-[18px] text-[#444]">
            Pin is at {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={`relative bg-[#f5f5f5] ${className}`}>
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY} onError={() => setMapFailed(true)}>
        <GoogleMap
          className="h-full w-full"
          mapId="DEMO_MAP_ID"
          // "default" props set the starting view only, so the map doesn't
          // jump back every time the pin moves.
          defaultCenter={hasPin ? position : CAMPUS_CENTER}
          defaultZoom={17}
          gestureHandling="cooperative"
          disableDefaultUI
          zoomControl
          onClick={(event) => {
            if (event.detail.latLng) onChange(event.detail.latLng)
          }}
        >
          {hasPin && (
            <AdvancedMarker
              position={position}
              draggable
              title="Cache location. Drag to move."
              onDragEnd={(event) => {
                if (event.latLng) onChange({ lat: event.latLng.lat(), lng: event.latLng.lng() })
              }}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#c8102e] bg-[#c8102e] text-white shadow-sm">
                <MapPin aria-hidden="true" size={19} strokeWidth={2.5} />
              </span>
            </AdvancedMarker>
          )}
        </GoogleMap>
      </APIProvider>
      <p className="pointer-events-none absolute bottom-2 left-2 bg-white/90 px-2 py-1 text-[13px] font-medium leading-[18px] text-[#444]">
        Drag the pin to move it
      </p>
    </div>
  )
}

export default LocationPicker
