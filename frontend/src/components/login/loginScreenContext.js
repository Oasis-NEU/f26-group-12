import { createContext, useContext } from 'react'

// Tells the shared log in screens (LoginScreens.jsx) where they're shown.
//   idFor(name)    the id for a field or the heading: plain on the Log in
//                  page ("login-email"), "dialog-login-email" in the dialog,
//                  so the two never clash
//   headingLevel   1 on the page; 2 in the dialog, whose page has its own <h1>
// Without a provider (the Log in page) it's the page's version.

export const PAGE_SCREEN = { idFor: (name) => name, headingLevel: 1 }
export const DIALOG_SCREEN = { idFor: (name) => `dialog-${name}`, headingLevel: 2 }

export const LoginScreenContext = createContext(PAGE_SCREEN)

export function useLoginScreen() {
  return useContext(LoginScreenContext)
}
