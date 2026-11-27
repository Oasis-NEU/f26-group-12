import { APIProvider, AdvancedMarker, Map as GoogleMap } from '@vis.gl/react-google-maps'
import MapPin from '../../components/MapPin.jsx'
import { cacheCoordinates } from './coords.js'

// A small, still map of where the cache is, shown in the photo's place when
// the cache has no photo. Same Google Maps setup (key and map id) as the map
// page. It's a picture, not a control: no dragging, zooming or tabbing into it
// (inert), and hidden from screen readers, since the location is written just
// below and "Get directions" is the thing to press. Google's logo and credits
// stay visible, as its terms require.
//
// The page only shows this when the key is set and the cache has coordinates;
// if Google Maps fails to load, onFail lets the page fall back to the empty
// photo frame.

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

function CacheMiniMap({ cache, found, onFail }) {
  const position = cacheCoordinates(cache)
  if (!position) return null

  return (
    <div aria-hidden="true" inert className="h-[180px] w-full overflow-hidden rounded-2xl lg:h-[400px]">
      <APIProvider apiKey={MAPS_API_KEY} onError={onFail}>
        <GoogleMap
          className="size-full"
          mapId="DEMO_MAP_ID"
          defaultCenter={position}
          defaultZoom={17}
          disableDefaultUI
          gestureHandling="none"
          keyboardShortcuts={false}
          clickableIcons={false}
        >
          <AdvancedMarker position={position}>
            <MapPin found={found} />
          </AdvancedMarker>
        </GoogleMap>
      </APIProvider>
    </div>
  )
}

export default CacheMiniMap
