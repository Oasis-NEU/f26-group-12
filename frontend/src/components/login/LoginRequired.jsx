import { useEffect, useRef } from 'react'
import Button from '../Button.jsx'
import { useLoginDialog } from './loginDialogContext.js'

// The signed-out state of a page that needs an account (Hide a cache, Log a
// find, Journal). The page stays where it is and the login dialog opens
// over it straight away. If they close the dialog, this calm message is
// what's left, with a "Log in" button to open it again, so nobody is
// trapped. Once they log in, the page notices by itself and carries on.
//
// Props:
//   heading    the page's heading for this state ("Log in to hide a cache"),
//              or leave it out when the page already shows its own <h1>
//   headingId  the heading's id (so the page can focus it)
//   reason     the line at the top of the dialog ("Log in to hide a cache.")
//   onLoggedIn optional: runs once they've logged in (e.g. to clear an
//              earlier "Log in again" state)
//   children   one or two sentences saying why an account is needed

function LoginRequired({ heading, headingId, reason, onLoggedIn, children, className = '' }) {
  const { openLogin } = useLoginDialog()
  const buttonRef = useRef(null)
  // The latest onLoggedIn, read only after logging in (not while drawing).
  const onLoggedInRef = useRef(onLoggedIn)
  useEffect(() => {
    onLoggedInRef.current = onLoggedIn
  })

  // Open the dialog when the signed-out page appears, and again from the
  // button. Closing it without logging in leaves focus on the button.
  // (React's development mode opens it twice on arrival; opening an open
  // dialog again changes nothing.)
  useEffect(() => {
    openLogin({ reason, returnFocus: () => buttonRef.current, onLoggedIn: () => onLoggedInRef.current?.() })
  }, [openLogin, reason])

  function open() {
    openLogin({ reason, returnFocus: () => buttonRef.current, onLoggedIn: () => onLoggedInRef.current?.() })
  }

  return (
    <div className={`flex max-w-[28rem] flex-col gap-4 ${className}`}>
      {heading && (
        <h1 id={headingId} tabIndex={-1} className="text-title text-text-primary outline-none lg:text-display">
          {heading}
        </h1>
      )}
      <p className="text-body text-text-primary">{children}</p>
      <Button ref={buttonRef} onClick={open} aria-haspopup="dialog" fullWidth className="lg:w-fit">
        Log in
      </Button>
    </div>
  )
}

export default LoginRequired
