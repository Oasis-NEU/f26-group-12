import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import Button from '../components/Button.jsx'
import { FOCUS_RING } from '../components/focusRing.js'
import SiteHeader from '../components/SiteHeader.jsx'
import TextField from '../components/TextField.jsx'
import {
  checkCode,
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
  sendLoginCode,
  sendPasswordReset,
  signUp,
  verifyLoginCode,
} from '../lib/auth.js'
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
const TITLES = {
  login: 'Log in',
  code: 'Log in with a code',
  signup: 'Create your account',
  forgot: 'Reset your password',
  reset: 'Set a new password',
}
// Text links. Padding with matching negative margins gives them a 28px-tall
// tap area (DESIGN.md's floor) without moving the text. The underline
// thickens on hover (mouse only; Tailwind's hover: skips touch screens).
const TEXT_LINK = `-my-1 cursor-pointer rounded-sm py-1 font-bold text-text-primary underline underline-offset-4 hover:decoration-2 ${FOCUS_RING}`
// Small links under a field: "Forgot password?", "Log in instead".
const SMALL_LINK = `-my-1 w-fit cursor-pointer rounded-sm py-1 text-small text-text-primary underline underline-offset-4 hover:decoration-2 ${FOCUS_RING}`
// A screen someone switched to (Log in, Sign up, Reset, Check your email)
// fades in and rises 4px: 200ms on the shared ease-out, like a hint being
// revealed, so the swap reads as a new step in the same place. starting: is
// the style it animates from (CSS @starting-style). With reduced motion on
// it only fades. The first screen on page load doesn't animate.
const SCREEN_ENTER =
  'transition-[opacity,translate] duration-200 ease-out starting:translate-y-1 starting:opacity-0 motion-reduce:starting:translate-y-0'

// Supabase reports a bad or expired email link in the URL it sends people
// back to (e.g. #error_code=otp_expired). Read it once, when the page opens.
function readLinkError() {
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const search = new URLSearchParams(window.location.search)
  return hash.get('error_code') || search.get('error_code') || hash.get('error') || search.get('error') || ''
}

// Text for a screen-reader live region. Saying the same thing twice ("Sent
// again.") isn't announced unless the text changes, so it's cleared first.
function useAnnouncer() {
  const [text, setText] = useState('')
  function announce(message) {
    setText('')
    requestAnimationFrame(() => setText(message))
  }
  return [text, announce]
}

// The errors, "busy" flag and helpers every form here shares. fieldIds maps
// a field name ('email') to its input's id, so an error can point at it.
function useFormState(fieldIds) {
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [announcement, announce] = useAnnouncer()

  // Point at the field with the problem: focus it, so screen readers read
  // the field with its error. If it already has focus (e.g. Enter pressed
  // in it), focusing again says nothing, so the error is announced instead.
  function point(field, message) {
    const id = fieldIds[field]
    if (document.activeElement?.id === id) announce(message)
    else requestAnimationFrame(() => document.getElementById(id)?.focus())
  }

  // Shows the problems found before sending. Returns true if there were any.
  function showProblems(found) {
    const first = Object.keys(found).find((field) => found[field])
    setErrors(found)
    setFormError('')
    if (first) point(first, found[first])
    return Boolean(first)
  }

  // Shows what Supabase said, under the field it's about if there is one.
  // (A whole-form error is announced by FormError's role="alert".)
  function showError(error) {
    const { field, message } = describeAuthError(error)
    if (field && fieldIds[field]) {
      setErrors({ [field]: message })
      setFormError('')
      point(field, message)
    } else {
      setFormError(message)
    }
  }

  // Typing in a field clears its error.
  function clearError(field) {
    setErrors((current) => (current[field] ? { ...current, [field]: '' } : current))
  }

  return { errors, formError, submitting, setSubmitting, showProblems, showError, clearError, announcement }
}

// The form's submit button. While working it stays red and says what it's
// doing ("Logging in…"): aria-disabled marks it busy and the form ignores
// extra presses. (disabled would grey it out, which reads as broken in
// sunlight, and would drop keyboard focus to the top of the page.)
function SubmitButton({ busy, busyLabel, children }) {
  return (
    <Button type="submit" fullWidth aria-disabled={busy || undefined} className="aria-disabled:cursor-wait">
      {busy ? busyLabel : children}
    </Button>
  )
}

// A hidden line screen readers read when a form announces something.
function LiveRegion({ text }) {
  return (
    <p className="sr-only" aria-live="polite">
      {text}
    </p>
  )
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

// Every screen's heading. It can take focus (tabIndex -1) so that after a
// switch, keyboard and screen-reader users land on the new screen; it has
// no focus ring because it isn't something to press.
function Heading({ children }) {
  return (
    <h1 id="login-heading" tabIndex={-1} className="text-center text-title text-text-primary outline-none lg:text-display">
      {children}
    </h1>
  )
}

// The eye inside a password field that shows or hides the password. It's
// a toggle: its name stays "Show password" and aria-pressed says whether
// it's on; the icon changes (eye, then eye crossed out) for everyone else.
function PasswordEye({ shown, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Show password"
      aria-pressed={shown}
      className={`flex size-10 cursor-pointer items-center justify-center rounded-lg text-text-secondary hover:text-text-primary ${FOCUS_RING}`}
    >
      {shown ? <EyeOff aria-hidden="true" size={20} /> : <Eye aria-hidden="true" size={20} />}
    </button>
  )
}

// "or" between two ways to do the same thing, as in Figma.
function OrDivider() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-border-subtle contrast-more:bg-border-input" />
      <span className="text-small text-text-secondary">or</span>
      <span className="h-px flex-1 bg-border-subtle contrast-more:bg-border-input" />
    </div>
  )
}

// The email field every screen shares. Its autocomplete is "username"
// because the email is what people log in with, so password managers save
// and fill it as the login.
function EmailField({ id, email, onEmailChange, error, clearError }) {
  return (
    <TextField
      id={id}
      label="Email"
      type="email"
      inputMode="email"
      autoComplete="username"
      placeholder="you@northeastern.edu"
      value={email}
      onChange={(event) => {
        onEmailChange(event.target.value)
        clearError('email')
      }}
      error={error}
    />
  )
}

function LoginForm({ email, onEmailChange, notice, linkError, confirmRedirect, switchTo }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // Set when Supabase says the email isn't confirmed yet, to offer a new link.
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [resendStatus, sayResendStatus] = useAnnouncer()
  const form = useFormState({ email: 'login-email', password: 'login-password' })

  async function handleSubmit(event) {
    event.preventDefault()
    if (form.submitting) return
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

  // Sends a new confirmation link to the email in the field.
  async function handleResend() {
    if (form.showProblems({ email: checkEmail(email) })) return
    sayResendStatus('Sending…')
    try {
      await resendConfirmation(supabase, { email, redirectTo: confirmRedirect })
      sayResendStatus('Sent. Check your email for the new link.')
    } catch (error) {
      sayResendStatus(describeAuthError(error).message)
    }
  }

  const resendButton = (
    <button type="button" onClick={handleResend} className={TEXT_LINK}>
      {linkError === 'confirm' ? 'send a new link' : 'Send it again'}
    </button>
  )

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Heading>Log in</Heading>
      {notice && <Notice>{notice}</Notice>}
      {/* A confirmation link that expired: send a new one to the email typed below. */}
      {linkError === 'confirm' && (
        <Notice>
          That confirmation link has expired or was already used. Enter your email below, then {resendButton}.
        </Notice>
      )}
      {linkError === 'other' && <Notice>That email link has expired or was already used.</Notice>}
      <div className="flex flex-col gap-4">
        <EmailField
          id="login-email"
          email={email}
          onEmailChange={onEmailChange}
          error={form.errors.email}
          clearError={form.clearError}
        />
        <div className="flex flex-col gap-2">
          <TextField
            id="login-password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              form.clearError('password')
            }}
            error={form.errors.password}
            action={<PasswordEye shown={showPassword} onToggle={() => setShowPassword((shown) => !shown)} />}
          />
          <button type="button" onClick={() => switchTo('forgot')} className={SMALL_LINK}>
            Forgot password?
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <SubmitButton busy={form.submitting} busyLabel="Logging in…">
          Log in
        </SubmitButton>
        <FormError message={form.formError} />
        {/* The other way in: a code by email instead of the password. */}
        <OrDivider />
        <Button variant="secondary" fullWidth onClick={() => switchTo('code')}>
          Email me a code instead
        </Button>
        {unconfirmed && linkError !== 'confirm' && (
          <p className="text-small text-text-secondary">Didn’t get the link? {resendButton}</p>
        )}
        {resendStatus && <p className="text-small text-text-secondary">{resendStatus}</p>}
      </div>
      {/* Hidden regions that are always there, so screen readers hear each
          change: field errors, and "Sending…" / "Sent." for a new link. */}
      <LiveRegion text={form.announcement} />
      <LiveRegion text={resendStatus} />
    </form>
  )
}

function SignUpForm({ email, onEmailChange, confirmRedirect, onSent, switchTo }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // Set when the email already has an account, to offer "Log in instead".
  const [emailTaken, setEmailTaken] = useState(false)
  const form = useFormState({ username: 'signup-username', email: 'signup-email', password: 'signup-password' })

  async function handleSubmit(event) {
    event.preventDefault()
    if (form.submitting) return
    setEmailTaken(false)
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
      if (error?.code === 'user_already_exists' || error?.code === 'email_exists') setEmailTaken(true)
      form.showError(error)
      form.setSubmitting(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Heading>Create your account</Heading>
      <div className="flex flex-col gap-4">
        {/* "nickname", not "username": the email is the login, so password
            managers shouldn't save this as the account name. */}
        <TextField
          id="signup-username"
          label="Username"
          autoComplete="nickname"
          autoCapitalize="none"
          spellCheck={false}
          help="Up to 30 characters. Other students see this on the leaderboard."
          value={username}
          onChange={(event) => {
            setUsername(event.target.value)
            form.clearError('username')
          }}
          error={form.errors.username}
        />
        <div className="flex flex-col gap-2">
          <EmailField
            id="signup-email"
            email={email}
            onEmailChange={(value) => {
              onEmailChange(value)
              setEmailTaken(false)
            }}
            error={form.errors.email}
            clearError={form.clearError}
          />
          {emailTaken && (
            <button type="button" onClick={() => switchTo('login')} className={SMALL_LINK}>
              Log in instead
            </button>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <TextField
            id="signup-password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            help="At least 8 characters."
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              form.clearError('password')
            }}
            error={form.errors.password}
            action={<PasswordEye shown={showPassword} onToggle={() => setShowPassword((shown) => !shown)} />}
          />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <SubmitButton busy={form.submitting} busyLabel="Creating account…">
          Create account
        </SubmitButton>
        <FormError message={form.formError} />
      </div>
      <LiveRegion text={form.announcement} />
    </form>
  )
}

// Log in with a code: enter your email, we email a code, type it in. For
// existing accounts only (sign-up needs a username). Two steps on one
// screen; the second fades in like a screen switch.
function CodeForm({ email, onEmailChange, redirectTo }) {
  const [step, setStep] = useState('email')
  const [code, setCode] = useState('')
  const [resendStatus, sayResendStatus] = useAnnouncer()
  const form = useFormState({ email: 'code-email', code: 'login-code' })

  async function sendCode() {
    await sendLoginCode(supabase, { email, redirectTo })
  }

  async function handleSendSubmit(event) {
    event.preventDefault()
    if (form.submitting) return
    if (form.showProblems({ email: checkEmail(email) })) return
    form.setSubmitting(true)
    try {
      await sendCode()
      form.setSubmitting(false)
      setCode('')
      setStep('code')
      requestAnimationFrame(() => document.getElementById('login-code')?.focus())
    } catch (error) {
      form.showError(error)
      form.setSubmitting(false)
    }
  }

  async function handleCodeSubmit(event) {
    event.preventDefault()
    if (form.submitting) return
    if (form.showProblems({ code: checkCode(code) })) return
    form.setSubmitting(true)
    try {
      // On success the page notices the new login and moves on by itself.
      await verifyLoginCode(supabase, { email, code })
    } catch (error) {
      form.showError(error)
      form.setSubmitting(false)
    }
  }

  async function handleResend() {
    sayResendStatus('Sending…')
    try {
      await sendCode()
      sayResendStatus('Sent a new code.')
    } catch (error) {
      sayResendStatus(describeAuthError(error).message)
    }
  }

  if (step === 'email') {
    return (
      <form noValidate onSubmit={handleSendSubmit} className="flex flex-col gap-6">
        <Heading>Log in with a code</Heading>
        <p className="text-balance text-center text-body text-text-secondary">
          We’ll email you a 6-digit code to log in with. No password needed.
        </p>
        <EmailField
          id="code-email"
          email={email}
          onEmailChange={onEmailChange}
          error={form.errors.email}
          clearError={form.clearError}
        />
        <div className="flex flex-col gap-3">
          <SubmitButton busy={form.submitting} busyLabel="Sending…">
            Send code
          </SubmitButton>
          <FormError message={form.formError} />
        </div>
        <LiveRegion text={form.announcement} />
      </form>
    )
  }

  return (
    <form noValidate onSubmit={handleCodeSubmit} className={`flex flex-col gap-6 ${SCREEN_ENTER}`}>
      <Heading>Enter your code</Heading>
      <p className="text-balance text-center text-body text-text-primary">
        We sent a code to <strong className="wrap-anywhere">{email.trim()}</strong>. It works once.
      </p>
      {/* one-time-code lets phones offer the code from the email or a text. */}
      <TextField
        id="login-code"
        label="Code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={12}
        value={code}
        onChange={(event) => {
          setCode(event.target.value)
          form.clearError('code')
        }}
        error={form.errors.code}
      />
      <div className="flex flex-col gap-3">
        <SubmitButton busy={form.submitting} busyLabel="Logging in…">
          Log in
        </SubmitButton>
        <FormError message={form.formError} />
      </div>
      <div className="flex flex-col items-center gap-2 text-center text-small text-text-secondary">
        <p>
          Didn’t get it?{' '}
          <button type="button" onClick={handleResend} className={TEXT_LINK}>
            Send a new code
          </button>
        </p>
        <p>
          Wrong email?{' '}
          <button
            type="button"
            onClick={() => {
              setStep('email')
              requestAnimationFrame(() => document.getElementById('code-email')?.focus())
            }}
            className={TEXT_LINK}
          >
            Use a different one
          </button>
        </p>
        {resendStatus && <p>{resendStatus}</p>}
      </div>
      <LiveRegion text={form.announcement} />
      <LiveRegion text={resendStatus} />
    </form>
  )
}

function ForgotForm({ email, onEmailChange, resetRedirect, onSent }) {
  const form = useFormState({ email: 'forgot-email' })

  async function handleSubmit(event) {
    event.preventDefault()
    if (form.submitting) return
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
      <EmailField
        id="forgot-email"
        email={email}
        onEmailChange={onEmailChange}
        error={form.errors.email}
        clearError={form.clearError}
      />
      <div className="flex flex-col gap-3">
        <SubmitButton busy={form.submitting} busyLabel="Sending…">
          Send link
        </SubmitButton>
        <FormError message={form.formError} />
      </div>
      <LiveRegion text={form.announcement} />
    </form>
  )
}

// Where the reset link lands. The link logs the person in for this one job,
// so without a session the link was bad, expired or already used.
function ResetForm({ hasSession, onSaved, switchTo }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const form = useFormState({ password: 'reset-password' })

  if (!hasSession) {
    return (
      <div className="flex flex-col gap-6">
        <Heading>That link has expired</Heading>
        <p className="text-balance text-center text-body text-text-secondary">
          Reset links only work once, and only for a while. Get a new one and use it soon.
        </p>
        <Button fullWidth onClick={() => switchTo('forgot')}>
          Get a new link
        </Button>
      </div>
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (form.submitting) return
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
      <div className="flex flex-col gap-2">
        <TextField
          id="reset-password"
          label="New password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          help="At least 8 characters."
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            form.clearError('password')
          }}
          error={form.errors.password}
          action={<PasswordEye shown={showPassword} onToggle={() => setShowPassword((shown) => !shown)} />}
        />
      </div>
      <div className="flex flex-col gap-3">
        <SubmitButton busy={form.submitting} busyLabel="Saving…">
          Save password
        </SubmitButton>
        <FormError message={form.formError} />
      </div>
      <LiveRegion text={form.announcement} />
    </form>
  )
}

// "Check your email", after sign up (kind="signup") or a reset request
// (kind="reset"): one sentence and a button back to Log in, plus a way to
// fix a mistyped email (and, after sign up, to send the link again).
function CheckEmail({ kind, email, onBack, onResend, onChangeEmail }) {
  const [resendStatus, sayResendStatus] = useAnnouncer()

  async function handleResend() {
    sayResendStatus('Sending…')
    try {
      await onResend()
      sayResendStatus('Sent again.')
    } catch (error) {
      sayResendStatus(describeAuthError(error).message)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Heading>Check your email</Heading>
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
      <div className="flex flex-col items-center gap-2 text-center text-small text-text-secondary">
        {kind === 'signup' && (
          <p>
            Didn’t get it?{' '}
            <button type="button" onClick={handleResend} className={TEXT_LINK}>
              Send it again
            </button>
          </p>
        )}
        <p>
          Wrong email?{' '}
          <button type="button" onClick={onChangeEmail} className={TEXT_LINK}>
            Use a different one
          </button>
        </p>
        {resendStatus && <p>{resendStatus}</p>}
      </div>
      {/* Always there, so screen readers hear each change. */}
      <LiveRegion text={resendStatus} />
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
  const origin = window.location.origin
  const confirmParams = new URLSearchParams({ link: 'confirm' })
  if (next) confirmParams.set('next', next)
  const confirmRedirect = `${origin}/login?${confirmParams}`
  const resetRedirect = `${origin}/login?mode=reset`
  // If the code email still has a link in it (Supabase's default template), the link
  // logs them in and comes back here, keeping ?next=.
  const loginRedirect = `${origin}/login${next ? `?next=${encodeURIComponent(next)}` : ''}`

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

  // The line that switches between screens.
  let switchLine = null
  if (!sent && mode === 'login') {
    switchLine = (
      <>
        Not a member?{' '}
        <button type="button" onClick={() => switchTo('signup')} className={TEXT_LINK}>
          Join now
        </button>
      </>
    )
  } else if (!sent && (mode === 'signup' || mode === 'forgot' || mode === 'code' || (mode === 'reset' && !session))) {
    const prompt = { signup: 'Already a member?', code: 'Rather use your password?' }[mode] ?? 'Remembered it?'
    switchLine = (
      <>
        {prompt}{' '}
        <button type="button" onClick={() => switchTo('login')} className={TEXT_LINK}>
          Log in
        </button>
      </>
    )
  }

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
