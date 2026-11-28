import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { FOCUS_RING } from '../components/focusRing.js'
import { loginRedirects, switchPrompt, TITLES } from '../components/login/loginFlow.js'
import {
  CheckEmail,
  CodeForm,
  ForgotForm,
  LoginForm,
  ResetForm,
  SCREEN_ENTER,
  SignUpForm,
  SwitchLine,
} from '../components/login/LoginScreens.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { logOut, resendConfirmation, safeNextPath } from '../lib/auth.js'
import { supabase } from '../lib/supabaseClient.js'

// Log in, sign up and reset a password: /login. From the Figma section
// "Log in · /login" and its notes.
//
// One page, five modes, picked by ?mode= in the URL:
//   (none)        Log in with email and password
//   ?mode=code    Log in with a code (we email a 6-digit code instead)
//   ?mode=signup  Create your account
//   ?mode=forgot  Reset your password (we email a link)
//   ?mode=reset   Set a new password (where that emailed link lands)
// After sign up or a reset request, a "Check your email" screen replaces
// the form. The email address is shared by every screen, so switching
// between them never means typing it again.
//
// The screens themselves live in components/login/LoginScreens.jsx, shared
// with the login dialog that opens on other pages (the heart, "Log in to
// log your find", the pages that need an account). This page is still
// where the header's "Log in" goes and where every emailed link lands.
//
// After logging in, people go back where they came from: the ?next= page if
// the link gave one (e.g. /login?next=/caches/abc/log), otherwise the page
// they were on before (one step back), otherwise the map. Switching modes
// replaces the URL instead of adding a history step, so "back" still means
// the page before the login page.
//
// Phones (the base styles): the form fills the screen, with "Not a member?
// Join now" at the bottom. Desktop (lg:): the form sits in a 448px card,
// and that line moves inside the card, under the button, because the bottom
// of a big screen is too far away to notice. On both, the form starts a
// fixed distance from the top, so it doesn't jump around between screens or
// when the phone keyboard opens.

const MODES = ['login', 'code', 'signup', 'forgot', 'reset']

// Supabase reports a bad or expired email link in the URL it sends people
// back to (e.g. #error_code=otp_expired). Read it once, when the page opens.
function readLinkError() {
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const search = new URLSearchParams(window.location.search)
  return hash.get('error_code') || search.get('error_code') || hash.get('error') || search.get('error') || ''
}

function LoginPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const requestedMode = searchParams.get('mode')
  const mode = MODES.includes(requestedMode) ? requestedMode : 'login'
  const next = safeNextPath(searchParams.get('next'))

  // Captured when the page opens: did they get here from another page of
  // the app? ("default" means this is the first page in the tab.)
  const [cameFromApp] = useState(() => location.key !== 'default')
  // An expired or bad email link: 'confirm' for a sign-up confirmation link
  // (they're tagged ?link=confirm), 'other' for any other, '' for none.
  const [linkError] = useState(() => {
    if (!readLinkError()) return ''
    return searchParams.get('link') === 'confirm' ? 'confirm' : 'other'
  })
  // undefined while checking, then the session or null.
  const [session, setSession] = useState(undefined)
  // The email typed on any screen, shared so switching never means retyping.
  const [email, setEmail] = useState('')
  // After sign up or a reset request: { kind, email } for "Check your email".
  const [sent, setSent] = useState(null)
  const [notice, setNotice] = useState('')
  // The history entry the page left from after logging in (see below).
  const leftFromRef = useRef(null)
  // Bumped each time someone switches screens: the new screen animates in
  // and its heading takes focus. Stays 0 for the first screen on page load.
  const [switches, setSwitches] = useState(0)

  useEffect(() => {
    if (switches) document.getElementById('login-heading')?.focus({ preventScroll: true })
  }, [switches])

  // Where the emailed links come back to. The confirm link is tagged
  // (link=confirm) so an expired one gets the right message, and keeps
  // ?next=, so confirming an account still ends up where they were headed.
  // If the code email still has a link in it (Supabase's default template), the link
  // logs them in and comes back here, keeping ?next=. (See loginFlow.js.)
  const redirects = loginRedirects(window.location.origin, next)
  const confirmRedirect = redirects.confirm
  const resetRedirect = redirects.reset
  const loginRedirect = redirects.login

  // Keep track of whether someone is logged in (Supabase also logs people in
  // when they arrive from a confirm or reset link).
  useEffect(() => {
    let active = true
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession ?? null)
    })
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session ?? null)
      })
      .catch(() => {
        if (active) setSession(null)
      })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  // Logged in (just now, or already): go back where they came from. Not
  // while setting a new password, which needs the reset link's login.
  // Going one step back can land on another login screen (e.g. if the
  // header's "Log in" was used while already here); if the page is still
  // here after leaving once, it goes to the map instead of staying blank.
  useEffect(() => {
    if (!session || mode === 'reset' || leftFromRef.current === location.key) return
    const firstTry = leftFromRef.current === null
    leftFromRef.current = location.key
    if (next) navigate(next, { replace: true })
    else if (cameFromApp && firstTry) navigate(-1)
    else navigate('/map', { replace: true })
  }, [session, mode, next, cameFromApp, navigate, location.key])

  // Switch mode without adding a history step (see the top of the file).
  function switchTo(nextMode) {
    const params = new URLSearchParams()
    if (nextMode !== 'login') params.set('mode', nextMode)
    if (next) params.set('next', next)
    const search = params.toString()
    setSent(null)
    setSwitches((count) => count + 1)
    navigate({ pathname: '/login', search: search ? `?${search}` : '' }, { replace: true })
  }

  // After sign up or a reset request: show "Check your email".
  function showSent(kind, sentTo) {
    setSent({ kind, email: sentTo })
    setSwitches((count) => count + 1)
  }

  // After saving a new password: log out of the reset link's session and
  // show Log in, so they log in with the new password.
  async function handlePasswordSaved() {
    await logOut(supabase).catch(() => {})
    setSession(null)
    setNotice('Your password is updated. Log in with your new password.')
    switchTo('login')
  }

  // The line that switches between screens ("Not a member? Join now").
  const line = switchPrompt(mode, { sent: Boolean(sent), hasSession: Boolean(session) })
  const switchLine = line && <SwitchLine line={line} switchTo={switchTo} />

  // While checking who's logged in (a moment), or while leaving, show no form.
  const ready = session !== undefined && !(session && mode !== 'reset')
  const shared = { email, onEmailChange: setEmail }
  let screen = null
  if (ready && sent) {
    screen = (
      <CheckEmail
        kind={sent.kind}
        email={sent.email}
        onBack={() => switchTo('login')}
        onResend={() => resendConfirmation(supabase, { email: sent.email, redirectTo: confirmRedirect })}
        onChangeEmail={() => switchTo(sent.kind === 'signup' ? 'signup' : 'forgot')}
      />
    )
  } else if (ready && mode === 'login') {
    screen = (
      <LoginForm {...shared} notice={notice} linkError={linkError} confirmRedirect={confirmRedirect} switchTo={switchTo} />
    )
  } else if (ready && mode === 'code') {
    screen = <CodeForm {...shared} redirectTo={loginRedirect} />
  } else if (ready && mode === 'signup') {
    screen = (
      <SignUpForm
        {...shared}
        confirmRedirect={confirmRedirect}
        onSent={(sentTo) => showSent('signup', sentTo)}
        switchTo={switchTo}
      />
    )
  } else if (ready && mode === 'forgot') {
    screen = <ForgotForm {...shared} resetRedirect={resetRedirect} onSent={(sentTo) => showSent('reset', sentTo)} />
  } else if (ready && mode === 'reset') {
    screen = <ResetForm hasSession={Boolean(session)} onSaved={handlePasswordSaved} switchTo={switchTo} />
  }

  const screenKey = sent ? `sent-${sent.kind}` : mode
  const enter = switches ? SCREEN_ENTER : ''
  let title = sent ? 'Check your email' : TITLES[mode]
  if (mode === 'reset' && session === null && !sent) title = 'That link has expired'

  return (
    <div className="flex min-h-dvh flex-col bg-bg-page text-text-primary">
      <title>{`${title} · HuskyCache`}</title>
      {/* Hidden until someone presses Tab, so keyboard users can jump past the header. */}
      <a
        href="#main-content"
        className={`sr-only rounded-lg bg-bg-surface px-4 py-2 text-label text-text-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 ${FOCUS_RING}`}
      >
        Skip to content
      </a>
      <SiteHeader />

      {/* The page's own <main> (Layout leaves it out here), with the header outside it. */}
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <div className="flex flex-1 flex-col px-4 pb-8 pt-10 lg:items-center lg:pb-16 lg:pt-20">
          {/* Phones: the form on the page. Desktop: a 448px white card. Capped
              at 448px in between too, so it never stretches across a tablet. */}
          <div className="mx-auto flex w-full max-w-[28rem] flex-col gap-6 lg:rounded-2xl lg:border lg:border-border-subtle lg:bg-bg-surface lg:p-8 lg:contrast-more:border-border-input">
            {screen && (
              <div key={screenKey} className={enter}>
                {screen}
              </div>
            )}
            {screen && switchLine && (
              <p key={`${screenKey}-switch`} className={`hidden text-center text-label text-text-secondary lg:block ${enter}`}>
                {switchLine}
              </p>
            )}
          </div>
        </div>
        {/* Phones: the switch line sits at the bottom of the screen, as in Figma. */}
        {screen && switchLine && (
          <p
            key={`${screenKey}-switch-phone`}
            className={`px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 text-center text-label text-text-secondary lg:hidden ${enter}`}
          >
            {switchLine}
          </p>
        )}
      </main>
    </div>
  )
}

export default LoginPage
