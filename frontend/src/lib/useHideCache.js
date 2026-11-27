import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient.js'

// What the "Hide a cache" page needs to know before showing the form: who
// is signed in. (Hiding a cache needs an account, so the page sends
// signed-out visitors to log in.) Saving goes through createCache in
// hideCache.js.
//
// userId is undefined while checking, then the user's id, or null when
// signed out.
export function useHideCache() {
  const [userId, setUserId] = useState(undefined)

  useEffect(() => {
    let active = true
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUserId(session?.user?.id ?? null)
    })
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setUserId(data.session?.user?.id ?? null)
      })
      .catch(() => {
        if (active) setUserId(null)
      })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  return { userId }
}
