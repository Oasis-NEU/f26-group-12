import { X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { resendConfirmation, safeNextPath } from '../../lib/auth.js'
import { supabase } from '../../lib/supabaseClient.js'
import { FOCUS_RING } from '../focusRing.js'
import { LoginDialogContext } from './loginDialogContext.js'
import { dialogMode, isNewLogin, loginRedirects, switchPrompt } from './loginFlow.js'
import { DIALOG_SCREEN, LoginScreenContext } from './loginScreenContext.js'
import { CheckEmail, CodeForm, ForgotForm, LoginForm, SCREEN_ENTER, SignUpForm, SwitchLine } from './LoginScreens.jsx'

// The login dialog: log in (or sign up) without leaving the page. Opened
// with useLoginDialog().openLogin(...) (see loginDialogContext.js) by the
// heart when logged out, the in-page "Log in" buttons, and the pages that
// need an account (Hide a cache, Journal, Log a find).
//
// It shows the Log in page's own screens (LoginScreens.jsx): log in, log in
// with a code, create an account, forgot password and "Check your email",
// switched inside the dialog (the screen lives here, not in the URL).
// Setting a new password stays on the Log in page, where the emailed link
// lands. The header's "Log in" still goes to that page too.
//
// Phones (the base styles): a sheet from the bottom of the screen, most of
// its height, with rounded top corners; it scrolls inside, and the switch
// line ("Not a member? Join now") sits at its bottom, as on the Log in page.
// Desktop (lg:): a centred 448px card, like the Log in page's card. Both
// float above a dimmed page, so they're one of the few things with the
// Overlay shadow.
//
// It's a native <dialog> opened with showModal(): the browser keeps focus
// inside it, makes the page behind unreachable, and closes it on Escape.
// Focus starts on its heading, and goes back to whatever opened it.
// When someone logs in, it closes by itself and runs onLoggedIn.

const HEADING_ID = DIALOG_SCREEN.idFor('login-heading')
const REASON_ID = 'login-dialog-reason'

// What's inside the dialog while it's open. Re-mounted on each opening, so
// it always starts fresh.
function LoginDialogContent({ initialMode, reason, onClose }) {
  const location = useLocation()
  const [mode, setMode] = useState(() => dialogMode(initialMode))
  // The email typed on any screen, shared so switching never means retyping.
  const [email, setEmail] = useState('')
  // After sign up or a reset request: { kind, email } for "Check your email".
  const [sent, setSent] = useState(null)
  // Bumped on each switch: the new screen animates in and its heading takes
  // focus. 0 for the first screen (the dialog itself focuses its heading).
  const [switches, setSwitches] = useState(0)

  useEffect(() => {
    if (switches) document.getElementById(HEADING_ID)?.focus({ preventScroll: true })
  }, [switches])

  // The emailed links open the Log in page, which brings people back to
  // this page (next) once they've confirmed.
  const next = safeNextPath(`${location.pathname}${location.search}`)
  const redirects = loginRedirects(window.location.origin, next)

  function switchTo(nextMode) {
    setSent(null)
    setMode(dialogMode(nextMode))
    setSwitches((count) => count + 1)
  }

  function showSent(kind, sentTo) {
    setSent({ kind, email: sentTo })
    setSwitches((count) => count + 1)
  }

  const shared = { email, onEmailChange: setEmail }
  let screen
  if (sent) {
    screen = (
      <CheckEmail
        kind={sent.kind}
        email={sent.email}
        onBack={() => switchTo('login')}
        onResend={() => resendConfirmation(supabase, { email: sent.email, redirectTo: redirects.confirm })}
        onChangeEmail={() => switchTo(sent.kind === 'signup' ? 'signup' : 'forgot')}
      />
    )
  } else if (mode === 'code') {
    screen = <CodeForm {...shared} redirectTo={redirects.login} />
  } else if (mode === 'signup') {
    screen = (
      <SignUpForm
        {...shared}
        confirmRedirect={redirects.confirm}
        onSent={(sentTo) => showSent('signup', sentTo)}
        switchTo={switchTo}
      />
    )
  } else if (mode === 'forgot') {
    screen = <ForgotForm {...shared} resetRedirect={redirects.reset} onSent={(sentTo) => showSent('reset', sentTo)} />
  } else {
    screen = <LoginForm {...shared} confirmRedirect={redirects.confirm} switchTo={switchTo} />
  }

  const line = switchPrompt(mode, { sent: Boolean(sent) })
  const screenKey = sent ? `sent-${sent.kind}` : mode
  const enter = switches ? SCREEN_ENTER : ''

  return (
    <LoginScreenContext.Provider value={DIALOG_SCREEN}>
      {/* The top row: why they're being asked to log in, and the close button. */}
      <div className="flex shrink-0 items-start gap-3 px-4 pt-3 lg:px-8 lg:pt-5">
        <p id={REASON_ID} className="min-w-0 flex-1 pt-2.5 text-small text-text-secondary">
          {reason}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={`-mr-2 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-secondary hover:bg-bg-subtle hover:text-text-primary ${FOCUS_RING}`}
        >
          <X aria-hidden="true" size={20} />
        </button>
      </div>
      {/* The screen, scrolling inside the sheet when it's taller than the
          screen (the phone keyboard, large text). overscroll-contain keeps
          a scroll at its end from moving the page behind. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2 lg:px-8 lg:pb-8">
        <div className="mx-auto flex w-full max-w-[28rem] flex-1 flex-col gap-6">
          <div key={screenKey} className={enter}>
            {screen}
          </div>
          {line && (
            // At the bottom of the phone sheet (mt-auto), as on the Log in
            // page; right under the form in the desktop card.
            <p key={`${screenKey}-switch`} className={`mt-auto text-center text-label text-text-secondary ${enter}`}>
              <SwitchLine line={line} switchTo={switchTo} />
            </p>
          )}
        </div>
      </div>
    </LoginScreenContext.Provider>
  )
}

function LoginDialogProvider({ children }) {
  const { pathname } = useLocation()
  const dialogRef = useRef(null)
  // What the dialog was opened with, while it's open (null when closed).
  // The ref mirrors the state for the auth listener and the close handlers.
  const [request, setRequest] = useState(null)
  const requestRef = useRef(null)
  const openings = useRef(0)
  // Whatever had focus when it opened, and where focus should go once it's
  // closed (set on close, used after the page has re-drawn).
  const openerRef = useRef(null)
  const focusAfterCloseRef = useRef(null)
  // Whether the current click started on the backdrop (see handleClick).
  const pressedBackdrop = useRef(false)

  const openLogin = useCallback((options = {}) => {
    const current = requestRef.current
    if (!current) {
      openerRef.current = document.activeElement
      openings.current += 1
    }
    // Opening it again while it's open (e.g. a page asking twice) keeps
    // the screen they're on and just updates what to do afterwards.
    const next = {
      key: openings.current,
      mode: current ? current.mode : options.mode,
      reason: options.reason ?? '',
      onLoggedIn: options.onLoggedIn,
      onClose: options.onClose,
      returnFocus: options.returnFocus,
      openedOn: window.location.pathname,
    }
    requestRef.current = next
    setRequest(next)
  }, [])

  // Closes it. loggedIn: they've just logged in (run onLoggedIn), otherwise
  // they closed it (run onClose).
  const finish = useCallback((loggedIn) => {
    const current = requestRef.current
    if (!current) return
    requestRef.current = null
    focusAfterCloseRef.current = { returnFocus: current.returnFocus, opener: openerRef.current }
    setRequest(null)
    if (dialogRef.current?.open) dialogRef.current.close()
    if (loggedIn) current.onLoggedIn?.()
    else current.onClose?.()
  }, [])

  const closeLogin = useCallback(() => finish(false), [finish])

  // Open the <dialog> when there's a request, with focus on its heading
  // (on a phone, focusing the email field would cover the sheet with the
  // keyboard straight away). The page behind stops scrolling meanwhile.
  const isOpen = Boolean(request)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!isOpen || !dialog) return
    if (!dialog.open) dialog.showModal()
    document.getElementById(HEADING_ID)?.focus({ preventScroll: true })
    const root = document.documentElement
    const before = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = before
    }
  }, [isOpen])

  // After closing, once the page has re-drawn: focus goes back to what
  // opened the dialog (or where the opener asked). If that's gone (logging
  // in often replaces the "Log in" button that opened it), to the page's
  // main content, so keyboard and screen-reader users aren't left at the
  // top of the document.
  useEffect(() => {
    if (isOpen || !focusAfterCloseRef.current) return
    const { returnFocus, opener } = focusAfterCloseRef.current
    focusAfterCloseRef.current = null
    const target = returnFocus?.() ?? opener
    if (target?.isConnected && target !== document.body) target.focus({ preventScroll: true })
    else document.getElementById('main-content')?.focus({ preventScroll: true })
  }, [isOpen])

  // Logged in (password, code, or a sign-up that needed no email check):
  // close and finish what they were doing.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (requestRef.current && isNewLogin(event, session)) finish(true)
    })
    return () => subscription.unsubscribe()
  }, [finish])

  // Leaving the page (e.g. the browser's back button) closes it.
  useEffect(() => {
    if (requestRef.current && requestRef.current.openedOn !== pathname) finish(false)
  }, [pathname, finish])

  // A click on the dimmed backdrop closes it. The backdrop counts as the
  // <dialog> itself (its content fills the rest), and only a press that
  // also started there counts, so selecting text in a field and letting go
  // outside doesn't throw away what they typed.
  function handlePointerDown(event) {
    pressedBackdrop.current = event.target === event.currentTarget
  }
  function handleClick(event) {
    if (event.target === event.currentTarget && pressedBackdrop.current) finish(false)
    pressedBackdrop.current = false
  }

  // Escape is the browser's (it closes the dialog, then fires "close").
  // Stop it here so the page behind doesn't also react to it (e.g. the
  // map closing its popup).
  function handleKeyDown(event) {
    if (event.key === 'Escape') event.stopPropagation()
  }

  const value = useMemo(() => ({ openLogin, closeLogin }), [openLogin, closeLogin])

  return (
    <LoginDialogContext.Provider value={value}>
      {children}
      <dialog
        ref={dialogRef}
        aria-labelledby={HEADING_ID}
        aria-describedby={request?.reason ? REASON_ID : undefined}
        onClose={() => finish(false)}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="fixed inset-x-0 bottom-0 top-auto m-0 h-[calc(100dvh-3rem)] max-h-none w-full max-w-none overflow-hidden rounded-t-2xl border-0 bg-bg-surface p-0 text-text-primary shadow-overlay backdrop:bg-bg-inverse/40 open:flex open:flex-col lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[calc(100dvh-4rem)] lg:max-w-[28rem] lg:rounded-2xl lg:border lg:border-border-subtle lg:contrast-more:border-border-input"
      >
        {request && (
          <LoginDialogContent key={request.key} initialMode={request.mode} reason={request.reason} onClose={closeLogin} />
        )}
      </dialog>
    </LoginDialogContext.Provider>
  )
}

export default LoginDialogProvider
