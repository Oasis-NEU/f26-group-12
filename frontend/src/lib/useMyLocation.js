import { useEffect, useRef, useState } from 'react'

// "Show my location" for the map: the person's own position, only after they
// press the button. It comes from the browser (navigator.geolocation) and
// stays in this page's memory: HuskyCache never saves it or sends it to
// Supabase (PRODUCT.md: "No stored locations"). It isn't tied to Google
// Maps, so it works the same with any map library.
//
// status: 'off' (not asked yet), 'locating', 'on', 'denied' (the person or
// browser said no) or 'unavailable' (no signal, no GPS, or it timed out).

export function useMyLocation() {
  const [position, setPosition] = useState(null)
  const [status, setStatus] = useState('off')
  const watchRef = useRef(null)
  const positionRef = useRef(null)

  // Stop following the person when they leave the page.
  useEffect(
    () => () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    },
    [],
  )

  function stop() {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    watchRef.current = null
  }

  // Start following the person's position (it moves as they walk).
  // onFix runs with the first position, or right away if we already have
  // one, so the map can move to it.
  function locate(onFix) {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable')
      return
    }
    if (watchRef.current !== null) {
      if (positionRef.current) onFix?.(positionRef.current)
      return
    }

    setStatus('locating')
    let gotFix = false
    watchRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const next = { lat: coords.latitude, lng: coords.longitude }
        positionRef.current = next
        setPosition(next)
        setStatus('on')
        if (!gotFix) {
          gotFix = true
          onFix?.(next)
        }
      },
      (error) => {
        // A refusal ends it. Other errors only matter before the first fix;
        // after that, a dropped update just keeps the last position.
        if (error.code === error.PERMISSION_DENIED || !gotFix) {
          stop()
          positionRef.current = null
          setPosition(null)
          setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable')
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    )
  }

  return { position, status, locate }
}
