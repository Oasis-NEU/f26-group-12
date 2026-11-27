import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import Button from '../components/Button.jsx'
import { FOCUS_RING } from '../components/focusRing.js'
import SiteHeader from '../components/SiteHeader.jsx'
import TextField from '../components/TextField.jsx'
import {
  checkEmail,
  checkNewPassword,
  checkUsername,
  describeAuthError,
  isUsernameTaken,
  logIn,
  logOut,
  resendConfirmation,
  safeNextPath,
  saveNewPassword,
  sendPasswordReset,
  signUp,
} from '../lib/auth.js'
import { supabase } from '../lib/supabaseClient.js'

// Log in, sign up and reset a password: /login. From the Figma section
// "Log in · /login" and its notes.
//
// One page, four modes, picked by ?mode= in the URL:
//   (none)        Log in
//   ?mode=signup  Create your account
//   ?mode=forgot  Reset your password (we email a link)
//   ?mode=reset   Set a new password (where that emailed link lands)
// After sign up or a reset request, a "Check your email" screen replaces
// the form.
//
// After logging in, people go back where they came from: the ?next= page if
// the link gave one (e.g. /login?next=/caches/abc/log), otherwise the page
// they were on before (one step back), otherwise the map. Switching modes
// replaces the URL instead of adding a history step, so "back" still means
// the page before the login page.
//
// Phones (the base styles): the form fills the screen, with "Not a member?
// Join now" at the bottom. Desktop (lg:): the form sits in a 448px card in
// the middle of the page, and that line moves inside the card, under the
// button, because the bottom of a big screen is too far away to notice.

const MODES = ['login', 'signup', 'forgot', 'reset']
const TITLES = {
  login: 'Log in',
  signup: 'Create your account',
  forgot: 'Reset your password',
  reset: 'Set a new password',
}
const TEXT_LINK = `rounded-sm font-bold text-text-primary underline underline-offset-4 ${FOCUS_RING}`

// Supabase reports a bad or expired email link in the URL it sends people
// back to (e.g. #error_code=otp_expired). Read it once, when the page opens.
function readLinkError() {
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const search = new URLSearchParams(window.location.search)
  return hash.get('error_code') || search.get('error_code') || hash.get('error') || search.get('error') || ''
}

// Focus a field by id once React has drawn its error, so screen readers read
// the field and its message together.
function focusField(id) {
  requestAnimationFrame(() => document.getElementById(id)?.focus())
}

// The errors, "busy" flag and helpers every form here shares. fieldIds maps
// a field name ('email') to its input's id, so an error can focus it.
function useFormState(fieldIds) {
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Shows the problems found before sending. Returns true if there were any.
  function showProblems(found) {
    const first = Object.keys(found).find((field) => found[field])
    setErrors(found)
    setFormError('')
    if (first) focusField(fieldIds[first])
    return Boolean(first)
  }

  // Shows what Supabase said, under the field it's about if there is one.
  function showError(error) {
    const { field, message } = describeAuthError(error)
    if (field && fieldIds[field]) {
      setErrors({ [field]: message })
      setFormError('')
      focusField(fieldIds[field])
    } else {
      setFormError(message)
    }
  }

  // Typing in a field clears its error.
  function clearError(field) {
    setErrors((current) => (current[field] ? { ...current, [field]: '' } : current))
  }

  return { errors, formError, submitting, setSubmitting, showProblems, showError, clearError }
}

// A problem with the whole form (not one field), under the button.
function FormError({ message }) {
  if (!message) return null
  return (
    <p role="alert" className="text-small text-error">
      {message}
    </p>
  )
}

// A short neutral message at the top of a form, e.g. "Your password is updated."
function Notice({ children }) {
  return <div role="status" className="rounded-lg bg-bg-subtle px-4 py-3 text-small text-text-primary">{children}</div>
}

function Heading({ children }) {
  return <h1 className="text-center text-title text-text-primary lg:text-display">{children}</h1>
}

function LoginForm({ notice, linkError, switchTo, resendRedirect }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Set when Supabase says the email isn't confirmed yet, to offer a new link.
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [resendStatus, setResendStatus] = useState('')
  const form = useFormState({ email: 'login-email', password: 'login-password' })

  async function handleSubmit(event) {
    event.preventDefault()
    setUnconfirmed(false)
    if (form.showProblems({ email: checkEmail(email), password: password ? '' : 'Enter your password.' })) return
    form.setSubmitting(true)
    try {
      // On success the page notices the new login and moves on by itself.
      await logIn(supabase, { email, password })
    } catch (error) {
      if (error?.code === 'email_not_confirmed') setUnconfirmed(true)
      form.showError(error)
      form.setSubmitting(false)
    }
  }

  async function handleResend() {
    setResendStatus('Sending…')
    try {
      await resendConfirmation(supabase, { email, redirectTo: resendRedirect })
      setResendStatus('Sent. Check your email for the new link.')
    } catch (error) {
      setResendStatus(describeAuthError(error).message)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Heading>Log in</Heading>
      {notice && <Notice>{notice}</Notice>}
      {linkError && (
        <Notice>
          That email link has expired or was already used. Log in, or{' '}
          <button type="button" onClick={() => switchTo('forgot')} className={`cursor-pointer ${TEXT_LINK}`}>
            get a new reset link
          </button>
          .
        </Notice>
      )}
      <div className="flex flex-col gap-4">
        <TextField
          id="login-email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@northeastern.edu"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            form.clearError('email')
          }}
          error={form.errors.email}
        />
        <div className="flex flex-col gap-2">
          <TextField
            id="login-password"
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              form.clearError('password')
            }}
            error={form.errors.password}
          />
          {/* Padding gives the link a taller tap area; negative margins keep the spacing. */}
          <button
            type="button"
            onClick={() => switchTo('forgot')}
            className={`-my-1 w-fit cursor-pointer rounded-sm py-1 text-small text-text-primary underline underline-offset-4 ${FOCUS_RING}`}
          >
            Forgot password?
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Button type="submit" fullWidth disabled={form.submitting}>
          {form.submitting ? 'Logging in…' : 'Log in'}
        </Button>
        <FormError message={form.formError} />
        {unconfirmed && (
          <p className="text-small text-text-secondary">
            Didn’t get the link?{' '}
            <button type="button" onClick={handleResend} className={`cursor-pointer ${TEXT_LINK}`}>
              Send it again
            </button>
            {resendStatus && <span role="status"> {resendStatus}</span>}
          </p>
        )}
      </div>
    </form>
  )
}

function SignUpForm({ confirmRedirect, onSent }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const form = useFormState({ username: 'signup-username', email: 'signup-email', password: 'signup-password' })

  async function handleSubmit(event) {
    event.preventDefault()
    const found = { username: checkUsername(username), email: checkEmail(email), password: checkNewPassword(password) }
    if (form.showProblems(found)) return
    form.setSubmitting(true)
    try {
      // Check the username first, so a taken one gets a clear message. (If
      // this check fails, sign-up still catches a taken username below.)
      const taken = await isUsernameTaken(supabase, username).catch(() => false)
      if (taken) {
        form.showProblems({ username: 'That username is taken.' })
        form.setSubmitting(false)
        return
      }
      const { needsConfirmation } = await signUp(supabase, { username, email, password, redirectTo: confirmRedirect })
      // Without email confirmation they're logged in already, and the page
      // moves on by itself.
      if (needsConfirmation) onSent(email.trim())
    } catch (error) {
      form.showError(error)
      form.setSubmitting(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Heading>Create your account</Heading>
      <div className="flex flex-col gap-4">
        <TextField
          id="signup-username"
          label="Username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          help="Other students see this on the leaderboard."
          value={username}
          onChange={(event) => {
            setUsername(event.target.value)
            form.clearError('username')
          }}
          error={form.errors.username}
        />
        <TextField
          id="signup-email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@northeastern.edu"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            form.clearError('email')
          }}
          error={form.errors.email}
        />
        <TextField
          id="signup-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          help="At least 8 characters."
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            form.clearError('password')
          }}
          error={form.errors.password}
        />
      </div>
      <div className="flex flex-col gap-3">
        <Button type="submit" fullWidth disabled={form.submitting}>
          {form.submitting ? 'Creating account…' : 'Create account'}
        </Button>
        <FormError message={form.formError} />
      </div>
    </form>
  )
}

function ForgotForm({ resetRedirect, onSent }) {
  const [email, setEmail] = useState('')
  const form = useFormState({ email: 'forgot-email' })

  async function handleSubmit(event) {
    event.preventDefault()
    if (form.showProblems({ email: checkEmail(email) })) return
    form.setSubmitting(true)
    try {
      await sendPasswordReset(supabase, { email, redirectTo: resetRedirect })
      onSent(email.trim())
    } catch (error) {
      form.showError(error)
      form.setSubmitting(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Heading>Reset your password</Heading>
      <p className="text-balance text-center text-body text-text-secondary">
        Enter your email and we’ll send you a link to set a new password.
      </p>
      <TextField
        id="forgot-email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@northeastern.edu"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value)
          form.clearError('email')
        }}
        error={form.errors.email}
      />
      <div className="flex flex-col gap-3">
        <Button type="submit" fullWidth disabled={form.submitting}>
          {form.submitting ? 'Sending…' : 'Send link'}
        </Button>
        <FormError message={form.formError} />
      </div>
    </form>
  )
}

// Where the reset link lands. The link logs the person in for this one job,
// so without a session the link was bad, expired or already used.
function ResetForm({ hasSession, onSaved, switchTo }) {
  const [password, setPassword] = useState('')
  const form = useFormState({ password: 'reset-password' })

  if (!hasSession) {
    return (
      <div className="flex flex-col gap-6">
        <Heading>Set a new password</Heading>
        <p className="text-balance text-center text-body text-text-secondary">
          That reset link has expired or was already used. Ask for a new one.
        </p>
        <Button fullWidth onClick={() => switchTo('forgot')}>
          Send a new link
        </Button>
      </div>
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (form.showProblems({ password: checkNewPassword(password) })) return
    form.setSubmitting(true)
    try {
      await saveNewPassword(supabase, password)
      await onSaved()
    } catch (error) {
      form.showError(error)
      form.setSubmitting(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Heading>Set a new password</Heading>
      <TextField
        id="reset-password"
        label="New password"
        type="password"
        autoComplete="new-password"
        help="At least 8 characters."
        value={password}
        onChange={(event) => {
          setPassword(event.target.value)
          form.clearError('password')
        }}
        error={form.errors.password}
      />
      <div className="flex flex-col gap-3">
        <Button type="submit" fullWidth disabled={form.submitting}>
          {form.submitting ? 'Saving…' : 'Save password'}
        </Button>
        <FormError message={form.formError} />
      </div>
    </form>
  )
}

// "Check your email", after sign up (kind="signup") or a reset request
// (kind="reset"): one sentence and a button back to Log in.
function CheckEmail({ kind, email, onBack, onResend }) {
  const [resendStatus, setResendStatus] = useState('')
  const headingRef = useRef(null)

  // Focus the heading when this screen replaces the form, so screen readers
  // announce it.
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  async function handleResend() {
    setResendStatus('Sending…')
    try {
      await onResend()
      setResendStatus('Sent again.')
    } catch (error) {
      setResendStatus(describeAuthError(error).message)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 ref={headingRef} tabIndex={-1} className="text-center text-title text-text-primary outline-none lg:text-display">
        Check your email
      </h1>
      <p className="text-balance text-center text-body text-text-primary">
        {kind === 'signup' ? (
          <>
            We sent a link to <strong className="wrap-anywhere">{email}</strong>. Open it to confirm your account.
          </>
        ) : (
          <>
            If an account uses <strong className="wrap-anywhere">{email}</strong>, we sent it a link to set a new
            password.
          </>
        )}
      </p>
      <Button fullWidth onClick={onBack}>
        Back to log in
      </Button>
      {kind === 'signup' && (
        <p className="text-center text-small text-text-secondary">
          Didn’t get it?{' '}
          <button type="button" onClick={handleResend} className={`cursor-pointer ${TEXT_LINK}`}>
            Send it again
          </button>
          {resendStatus && <span role="status"> {resendStatus}</span>}
        </p>
      )}
    </div>
  )
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
  const [linkError] = useState(readLinkError)
  // undefined while checking, then the session or null.
  const [session, setSession] = useState(undefined)
  // After sign up or a reset request: { kind, email } for "Check your email".
  const [sent, setSent] = useState(null)
  const [notice, setNotice] = useState('')
  const leftRef = useRef(false)

  // Where the emailed links come back to. The confirm link keeps ?next=, so
  // confirming an account still ends up where they were headed.
  const origin = window.location.origin
  const confirmRedirect = `${origin}/login${next ? `?next=${encodeURIComponent(next)}` : ''}`
  const resetRedirect = `${origin}/login?mode=reset`

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
  useEffect(() => {
    if (!session || mode === 'reset' || leftRef.current) return
    leftRef.current = true
    if (next) navigate(next, { replace: true })
    else if (cameFromApp) navigate(-1)
    else navigate('/map', { replace: true })
  }, [session, mode, next, cameFromApp, navigate])

  // Switch mode without adding a history step (see the top of the file).
  function switchTo(nextMode) {
    const params = new URLSearchParams()
    if (nextMode !== 'login') params.set('mode', nextMode)
    if (next) params.set('next', next)
    const search = params.toString()
    setSent(null)
    navigate({ pathname: '/login', search: search ? `?${search}` : '' }, { replace: true })
  }

  // After saving a new password: log out of the reset link's session and
  // show Log in, so they log in with the new password.
  async function handlePasswordSaved() {
    await logOut(supabase).catch(() => {})
    setSession(null)
    setNotice('Your password is updated. Log in with your new password.')
    switchTo('login')
  }

  // The line that switches between Log in and Sign up.
  let switchLine = null
  if (!sent && mode === 'login') {
    switchLine = (
      <>
        Not a member?{' '}
        <button type="button" onClick={() => switchTo('signup')} className={`cursor-pointer ${TEXT_LINK}`}>
          Join now
        </button>
      </>
    )
  } else if (!sent && (mode === 'signup' || mode === 'forgot')) {
    switchLine = (
      <>
        {mode === 'signup' ? 'Already a member?' : 'Remembered it?'}{' '}
        <button type="button" onClick={() => switchTo('login')} className={`cursor-pointer ${TEXT_LINK}`}>
          Log in
        </button>
      </>
    )
  }

  // While checking who's logged in (a moment), or while leaving, show no form.
  const ready = session !== undefined && !(session && mode !== 'reset')
  let screen = null
  if (ready && sent) {
    screen = (
      <CheckEmail
        kind={sent.kind}
        email={sent.email}
        onBack={() => switchTo('login')}
        onResend={() => resendConfirmation(supabase, { email: sent.email, redirectTo: confirmRedirect })}
      />
    )
  } else if (ready && mode === 'login') {
    screen = (
      <LoginForm
        notice={notice}
        linkError={Boolean(linkError)}
        switchTo={switchTo}
        resendRedirect={confirmRedirect}
      />
    )
  } else if (ready && mode === 'signup') {
    screen = <SignUpForm confirmRedirect={confirmRedirect} onSent={(email) => setSent({ kind: 'signup', email })} />
  } else if (ready && mode === 'forgot') {
    screen = <ForgotForm resetRedirect={resetRedirect} onSent={(email) => setSent({ kind: 'reset', email })} />
  } else if (ready && mode === 'reset') {
    screen = <ResetForm hasSession={Boolean(session)} onSaved={handlePasswordSaved} switchTo={switchTo} />
  }

  const title = sent ? 'Check your email' : TITLES[mode]

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
        <div className="flex flex-1 flex-col justify-center px-4 py-8 lg:items-center lg:py-16">
          {/* Phones: the form on the page. Desktop: a 448px white card. Capped
              at 448px in between too, so it never stretches across a tablet. */}
          <div className="mx-auto flex w-full max-w-[28rem] flex-col gap-6 lg:rounded-2xl lg:border lg:border-border-subtle lg:bg-bg-surface lg:p-8 lg:contrast-more:border-border-input">
            {screen}
            {screen && switchLine && <p className="hidden text-center text-label text-text-secondary lg:block">{switchLine}</p>}
          </div>
        </div>
        {/* Phones: the switch line sits at the bottom of the screen, as in Figma. */}
        {screen && switchLine && (
          <p className="px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 text-center text-label text-text-secondary lg:hidden">
            {switchLine}
          </p>
        )}
      </main>
    </div>
  )
}

export default LoginPage
