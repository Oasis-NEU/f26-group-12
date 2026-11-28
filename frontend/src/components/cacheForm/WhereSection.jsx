import { LocateFixed } from 'lucide-react'
import { useId, useState } from 'react'
import { LOCATION_MAX_LENGTH } from '../../lib/hideCache.js'
import Button from '../Button.jsx'
import LocationPicker from '../LocationPicker.jsx'
import TextField from '../TextField.jsx'
import FieldMessage from './FieldMessage.jsx'
import FormSection from './FormSection.jsx'
import { LOCATION_BUTTON_ID } from './formStyles.js'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
// GPS readings rougher than this get a warning (metres).
const ROUGH_ACCURACY_M = 30

// "Where is it?": the map to place the pin (when Google Maps is set up),
// and "Use my current location", which works without a map and is quickest
// when you're standing at the spot. The browser asks first; the location
// only sets the pin (saved as the cache's spot), and says how accurate it
// is, warning when it's rough. Then the location name.
//
// startsPlaced: the pin starts at a spot that's already saved (Edit cache),
// so until they move it, the words talk about the saved spot rather than
// "your location". Hide a cache leaves it out.
function WhereSection({ position, onPosition, locationName, onLocationName, error, startsPlaced = false }) {
  const [locating, setLocating] = useState('idle')
  // How accurate the last location was, in metres (not saved anywhere).
  const [accuracy, setAccuracy] = useState(null)
  // Whether "Use my current location" has set the pin on this page yet.
  const [moved, setMoved] = useState(false)
  const messageId = useId()
  // The saved spot, not moved yet (Edit cache only).
  const atSavedSpot = startsPlaced && !moved

  function useMyLocation() {
    if (locating === 'locating') return
    if (!('geolocation' in navigator)) {
      setLocating('unavailable')
      return
    }
    setLocating('locating')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onPosition({ lat: coords.latitude, lng: coords.longitude })
        setAccuracy(Number.isFinite(coords.accuracy) ? Math.round(coords.accuracy) : null)
        setMoved(true)
        setLocating('idle')
      },
      (failure) => setLocating(failure.code === failure.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  let help = atSavedSpot ? 'Moves the pin to where you’re standing.' : 'Sets the pin to where you’re standing.'
  if (locating === 'locating') help = 'Finding where you are…'
  else if (locating === 'denied') {
    help = 'Location is off for this site. Allow it in your browser’s settings, or place the pin on the map.'
  } else if (locating === 'unavailable') {
    help = 'Your location isn’t available right now. Try again outside, or place the pin on the map.'
  } else if (accuracy !== null && position) {
    help =
      accuracy > ROUGH_ACCURACY_M
        ? `That’s only accurate to about ${accuracy} m. Step into the open, wait a moment, then try again.`
        : `Pin set to where you’re standing (accurate to about ${accuracy} m).`
  }

  // The no-map frame's two lines.
  let frameTitle = 'The map isn’t set up here yet'
  let frameHelp = 'Stand at the cache and use your current location.'
  if (position && atSavedSpot) {
    frameTitle = 'The pin is at the cache’s saved spot'
    frameHelp = 'To move it, stand at the cache and use your current location.'
  } else if (position) {
    frameTitle = 'Pin set to your location'
    frameHelp = 'Use your location again to move it.'
  }

  return (
    <FormSection title="Where is it?">
      {GOOGLE_MAPS_API_KEY ? (
        <LocationPicker
          position={position}
          onChange={(value) => {
            onPosition(value)
            setAccuracy(null)
            setMoved(true)
          }}
          className="h-[180px] overflow-hidden rounded-2xl lg:h-[360px]"
        />
      ) : (
        // No map here yet: a frame like the cache page's "no photo" one,
        // pointing to the location button below.
        <div className="flex h-[180px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border-input px-6 text-center contrast-more:border-text-secondary lg:h-[360px]">
          <p className="text-body-strong text-text-primary">{frameTitle}</p>
          <p className="text-small text-text-secondary">{frameHelp}</p>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Button
          id={LOCATION_BUTTON_ID}
          variant="secondary"
          fullWidth
          onClick={useMyLocation}
          aria-disabled={locating === 'locating' || undefined}
          aria-describedby={messageId}
          className="gap-2 aria-disabled:cursor-wait lg:w-fit"
        >
          <LocateFixed aria-hidden="true" size={18} />
          {position && !atSavedSpot ? 'Use my current location again' : 'Use my current location'}
        </Button>
        <div aria-live="polite">
          <FieldMessage id={messageId} error={error} help={help} />
        </div>
      </div>
      <TextField
        label="Location name (optional)"
        placeholder="e.g. near Snell Library"
        help="The general area finders head for."
        maxLength={LOCATION_MAX_LENGTH}
        enterKeyHint="next"
        value={locationName}
        onChange={(event) => onLocationName(event.target.value)}
      />
    </FormSection>
  )
}

export default WhereSection
