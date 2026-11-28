import { X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { resendConfirmation, safeNextPath } from '../../lib/auth.js'
import { supabase } from '../../lib/supabaseClient.js'
import { FOCUS_RING } from '../focusRing.js'
import { LoginDialogContext } from './loginDialogContext.js'
import { dialogMode, isNewLogin, loginRedirects, loginSnapshot, reasonFor, switchPrompt } from './loginFlow.js'
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
// Under the heading, a line says what they were doing ("Log in to add
// Krentzman Corner to your favorites."), from the task the opener passes.
//
// Phones (the base styles): a sheet from the bottom of the screen, only as
// tall as what's on it (so the page they were on still shows above it),
// with rounded top corners; it scrolls inside when it's taller than the
// screen. The switch line ("Not a member? Join now") comes right under the
// form. Desktop (lg:): a 448px card, like the Log in page's card, a fixed
// distance from the top (not centred, so it doesn't jump when the screen
// inside changes). Both float above a dimmed page, so they're one of the
// few things with the Overlay shadow.
//
// Motion: see OPEN_MOTION below. Switching screens inside reuses the Log in
// page's fade-and-rise (SCREEN_ENTER).
//
// It's a native <dialog> opened with showModal(): the browser keeps focus
// inside it, makes the page behind unreachable, and closes it on Escape.
// Focus starts on its heading, and goes back to whatever opened it.
// When someone logs in, it closes by itself and runs onLoggedIn. The email
// they typed is kept while they stay on the page, so closing it by mistake
// doesn't mean typing it again (passwords never are).

// Motion (DESIGN.md: on the shared ease-out, under 300ms, reduced motion
// fades only). Opening is something someone did, so it shows where the
// dialog came from: the phone sheet slides up from the bottom edge (250ms;
// a sheet has further to travel than a menu), and the desktop
// card fades in and grows from 97% out of the middle (200ms), like the
// account menu but centred, since it isn't attached to what opened it.
// The dimmed backdrop fades in alongside. starting: is the style it
// animates from (CSS @starting-style), so this plays each time showModal()
// opens it. Closing is instant: once they've chosen to leave (or logged
// in), the page should be back straight away, as with the menus.
const OPEN_MOTION = [
  // Phones: slide up from below the screen.
  'transition-[translate,opacity,scale] duration-250 ease-out starting:open:translate-y-full',
  'backdrop:transition-opacity backdrop:duration-250 backdrop:ease-out starting:open:backdrop:opacity-0',
  // Desktop: fade in and grow from 97%, no slide.
  'lg:duration-200 lg:starting:open:translate-y-0 lg:starting:open:scale-97 lg:starting:open:opacity-0 lg:backdrop:duration-200',
  // Reduced motion: no slide or growth, only the fade.
  // (lg:motion-reduce: too, so the desktop growth above doesn't win.)
  'motion-reduce:starting:open:translate-y-0 motion-reduce:starting:open:opacity-0 lg:motion-reduce:starting:open:scale-100',
].join(' ')

const HEADING_ID = DIALOG_SCREEN.idFor('login-heading')
const REASON_ID = DIALOG_SCREEN.idFor('login-reason')

// What's inside the dialog while it's open. Re-mounted on each opening, so
// it starts on the screen asked for (the email lives in the provider).
//   task        what they were doing ("add Krentzman Corner to your
//               favorites"), for the line under the heading and "Check your
//               email"
//   showReason  false on the pages that need an account, whose own heading
//               already says it ("Log in to hide a cache")
//   expired     their login ran out mid-task ("Log in again to …")
function LoginDialogContent({ initialMode, task, showReason, expired, email, setEmail, onClose }) {
  const location = useLocation()
  const [mode, setMode] = useState(() => dialogMode(initialMode))
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
        task={task}
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
  // The line under the heading (Heading in LoginScreens.jsx shows it).
  const reason = showReason && !sent ? reasonFor(mode, task, { expired }) : null
  const screenContext = useMemo(() => ({ ...DIALOG_SCREEN, reason }), [reason])

  return (
    <LoginScreenContext.Provider value={screenContext}>
      {/* The top row: the close button. Pressing shrinks it to 97%, like
          the other icon buttons. */}
      <div className="flex shrink-0 justify-end px-4 pt-3 lg:px-8 lg:pt-5">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={`-mr-2 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-secondary hover:bg-bg-subtle hover:text-text-primary active:scale-97 motion-safe:transition-[background-color,scale] motion-safe:duration-150 motion-safe:ease-out ${FOCUS_RING}`}
        >
          <X aria-hidden="true" size={20} />
        </button>
      </div>
      {/* The screen, scrolling inside the sheet when it's taller than the
          screen (the phone keyboard, large text). overscroll-contain keeps
          a scroll at its end from moving the page behind. */}
      <div className="min-h-0 shrink overflow-y-auto overscroll-contain px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] lg:px-8 lg:pb-8">
        <div className="mx-auto flex w-full max-w-[28rem] flex-col gap-6">
          <div key={screenKey} className={enter}>
            {screen}
          </div>
          {line && (
            // Right under the form, so the way in for newcomers ("Not a
            // member? Join now") is in view, not at the far end of a sheet.
            <p key={`${screenKey}-switch`} className={`text-center text-label text-text-secondary ${enter}`}>
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
  // Who's logged in right now, kept up to date by the auth listener below,
  // so each opening can note who was logged in when it opened.
  const sessionRef = useRef(null)
  // The email typed in the dialog, kept across openings on the same page.
  const [email, setEmail] = useState('')
  const [emailPage, setEmailPage] = useState(pathname)
  if (emailPage !== pathname) {
    setEmailPage(pathname)
    setEmail('')
  }

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
      task: options.task ?? null,
      showReason: options.showReason ?? true,
      expired: options.expired ?? false,
      // Who was logged in when it opened (usually nobody), so only a new
      // login closes it (isNewLogin).
      before: current ? current.before : loginSnapshot(sessionRef.current),
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
    // After a login this runs from inside Supabase's login event, where
    // Supabase says not to call it again (it can stall), so onLoggedIn
    // waits for that event to finish first.
    if (loggedIn) setTimeout(() => current.onLoggedIn?.(), 0)
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

  // Logged in (password, code, a sign-up that needed no email check, or the
  // sign-up confirmation link opened in another tab): close and finish what
  // they were doing. Supabase restoring the same login (when the tab comes
  // back into view) doesn't count; see isNewLogin.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const current = requestRef.current
      if (current && isNewLogin(event, session, current.before)) finish(true)
      sessionRef.current = session ?? null
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
        aria-describedby={request?.task && request.showReason ? REASON_ID : undefined}
        onClose={() => finish(false)}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`fixed inset-x-0 bottom-0 top-auto m-0 h-auto max-h-[calc(100dvh-3rem)] w-full max-w-none overflow-hidden rounded-t-2xl border-0 bg-bg-surface p-0 text-text-primary shadow-overlay backdrop:bg-bg-inverse/40 open:flex open:flex-col lg:inset-x-0 lg:top-0 lg:bottom-auto lg:mx-auto lg:mb-0 lg:mt-24 lg:max-h-[calc(100dvh-8rem)] lg:max-w-[28rem] lg:rounded-2xl lg:border lg:border-border-subtle lg:contrast-more:border-border-input ${OPEN_MOTION}`}
      >
        {request && (
          <LoginDialogContent
            key={request.key}
            initialMode={request.mode}
            task={request.task}
            showReason={request.showReason}
            expired={request.expired}
            email={email}
            setEmail={setEmail}
            onClose={closeLogin}
          />
        )}
      </dialog>
    </LoginDialogContext.Provider>
  )
}

export default LoginDialogProvider
