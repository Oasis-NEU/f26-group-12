import { createContext, useContext } from 'react'
import { safeNextPath } from '../../lib/auth.js'

// The app's one login dialog (LoginDialogProvider.jsx, mounted in App.jsx
// around every route). Any component can open it:
//
//   const { openLogin } = useLoginDialog()
//   openLogin({
//     task: 'add Krentzman Corner to your favorites',
//                                 // what they were doing: shown under the heading
//                                 // ("Log in to …", "Create an account to …") and
//                                 // after sign-up ("…come back to this tab to …")
//     expired: true,              // their login ran out: "Your login ran out. Log in again to …"
//     showReason: false,          // don't show the task under the heading (the page already says it)
//     mode: 'signup',             // the first screen: login (default), code, signup or forgot
//     onLoggedIn: () => { ... },  // runs once they've logged in (the dialog closes itself).
//                                 // It runs just after Supabase's login event, so it may call Supabase.
//     onClose: () => { ... },     // runs if they close it without logging in
//     returnFocus: () => element, // where focus goes afterwards (default: what opened it)
//   })
//
// The page underneath keeps going by itself after logging in: every page
// already listens for Supabase's login changes.

export const LoginDialogContext = createContext(null)

// Without the provider (e.g. a page rendered on its own in a test), opening
// it falls back to the Log in page, which comes back here afterwards.
function openLoginPage() {
  const next = safeNextPath(`${window.location.pathname}${window.location.search}`)
  window.location.assign(`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`)
}
const FALLBACK = { openLogin: openLoginPage, closeLogin: () => {} }

export function useLoginDialog() {
  return useContext(LoginDialogContext) ?? FALLBACK
}
