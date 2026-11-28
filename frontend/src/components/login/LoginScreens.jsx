import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import Button from '../Button.jsx'
import { FOCUS_RING } from '../focusRing.js'
import TextField from '../TextField.jsx'
import {
  checkCode,
  checkEmail,
  checkNewPassword,
  checkUsername,
  describeAuthError,
  isUsernameTaken,
  logIn,
  resendConfirmation,
  saveNewPassword,
  sendLoginCode,
  sendPasswordReset,
  signUp,
  verifyLoginCode,
} from '../../lib/auth.js'
import { supabase } from '../../lib/supabaseClient.js'
import { useLoginScreen } from './loginScreenContext.js'

// The log in screens, shared by the Log in page (/login) and the login
// dialog (LoginDialogProvider.jsx), so both always show the same forms:
//   LoginForm    Log in with email and password
//   CodeForm     Log in with a code (we email a 6-digit code instead)
//   SignUpForm   Create your account
//   ForgotForm   Reset your password (we email a link)
//   ResetForm    Set a new password (the Log in page only: the emailed link lands there)
//   CheckEmail   "Check your email", after sign up or a reset request
//   SwitchLine   "Not a member? Join now" and the other lines that switch screens
//
// The forms don't decide what happens after logging in. Whoever shows them
// watches Supabase for the new login: the page goes back where people came
// from, and the dialog closes and finishes what they were doing.
//
// Ids: on the page the fields keep their plain ids ("login-email"); in the
// dialog they get a "dialog-" prefix and the heading is an <h2> (the page
// under it has its own <h1>). LoginScreenContext says which.

// Text links. Padding with matching negative margins gives them a 28px-tall
// tap area (DESIGN.md's floor) without moving the text. The underline
// thickens on hover (mouse only; Tailwind's hover: skips touch screens).
export const TEXT_LINK = `-my-1 cursor-pointer rounded-sm py-1 font-bold text-text-primary underline underline-offset-4 hover:decoration-2 ${FOCUS_RING}`
// Small links under a field: "Forgot password?", "Log in instead".
const SMALL_LINK = `-my-1 w-fit cursor-pointer rounded-sm py-1 text-small text-text-primary underline underline-offset-4 hover:decoration-2 ${FOCUS_RING}`
// A screen someone switched to (Log in, Sign up, Reset, Check your email)
// fades in and rises 4px: 200ms on the shared ease-out, like a hint being
// revealed, so the swap reads as a new step in the same place. starting: is
// the style it animates from (CSS @starting-style). With reduced motion on
// it only fades. The first screen on page load doesn't animate.
export const SCREEN_ENTER =
  'transition-[opacity,translate] duration-200 ease-out starting:translate-y-1 starting:opacity-0 motion-reduce:starting:translate-y-0'

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
// no focus ring because it isn't something to press. In the login dialog
// the line saying what they were doing ("Log in to add Krentzman Corner to
// your favorites.") sits right under it, in Body.
function Heading({ children }) {
  const { idFor, headingLevel, reason } = useLoginScreen()
  const Tag = headingLevel === 2 ? 'h2' : 'h1'
  const heading = (
    <Tag id={idFor('login-heading')} tabIndex={-1} className="text-center text-title text-text-primary outline-none lg:text-display">
      {children}
    </Tag>
  )
  if (!reason) return heading
  return (
    <div className="flex flex-col gap-2">
      {heading}
      <p id={idFor('login-reason')} className="text-balance text-center text-body text-text-primary">
        {reason}
      </p>
    </div>
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

export function LoginForm({ email, onEmailChange, notice, linkError, confirmRedirect, switchTo }) {
  const { idFor } = useLoginScreen()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // Set when Supabase says the email isn't confirmed yet, to offer a new link.
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [resendStatus, sayResendStatus] = useAnnouncer()
  const form = useFormState({ email: idFor('login-email'), password: idFor('login-password') })

  async function handleSubmit(event) {
    event.preventDefault()
    if (form.submitting) return
    setUnconfirmed(false)
    if (form.showProblems({ email: checkEmail(email), password: password ? '' : 'Enter your password.' })) return
    form.setSubmitting(true)
    try {
      // On success the page or dialog notices the new login and moves on.
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
          id={idFor('login-email')}
          email={email}
          onEmailChange={onEmailChange}
          error={form.errors.email}
          clearError={form.clearError}
        />
        <div className="flex flex-col gap-2">
          <TextField
            id={idFor('login-password')}
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

export function SignUpForm({ email, onEmailChange, confirmRedirect, onSent, switchTo }) {
  const { idFor } = useLoginScreen()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // Set when the email already has an account, to offer "Log in instead".
  const [emailTaken, setEmailTaken] = useState(false)
  const form = useFormState({ username: idFor('signup-username'), email: idFor('signup-email'), password: idFor('signup-password') })

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
      // Without email confirmation they’re logged in already, and the page
      // or dialog moves on by itself.
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
          id={idFor('signup-username')}
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
            id={idFor('signup-email')}
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
            id={idFor('signup-password')}
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
export function CodeForm({ email, onEmailChange, redirectTo }) {
  const { idFor } = useLoginScreen()
  const [step, setStep] = useState('email')
  const [code, setCode] = useState('')
  const [resendStatus, sayResendStatus] = useAnnouncer()
  const form = useFormState({ email: idFor('code-email'), code: idFor('login-code') })

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
      requestAnimationFrame(() => document.getElementById(idFor('login-code'))?.focus())
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
      // On success the page or dialog notices the new login and moves on.
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
          id={idFor('code-email')}
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
        id={idFor('login-code')}
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
              requestAnimationFrame(() => document.getElementById(idFor('code-email'))?.focus())
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

export function ForgotForm({ email, onEmailChange, resetRedirect, onSent }) {
  const { idFor } = useLoginScreen()
  const form = useFormState({ email: idFor('forgot-email') })

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
        id={idFor('forgot-email')}
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
export function ResetForm({ hasSession, onSaved, switchTo }) {
  const { idFor } = useLoginScreen()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const form = useFormState({ password: idFor('reset-password') })

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
          id={idFor('reset-password')}
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
// (kind="reset"), plus a way to fix a mistyped email.
//   After a reset request: one sentence and a button back to Log in.
//   After sign up: what happens next, and no big "Log in" button (logging
//   in before confirming only fails). Opening the link logs them in, in
//   this tab too (same browser), so in the login dialog it says they can
//   come back here to carry on with task ("add Krentzman Corner to your
//   favorites"). Small lines offer to send the link again, and a quiet
//   "Log in" for someone who confirmed on another device.
export function CheckEmail({ kind, email, task, onBack, onResend, onChangeEmail }) {
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
            We sent a link to <strong className="wrap-anywhere">{email}</strong>.{' '}
            {task
              ? `Open it to confirm your account, then come back to this tab to ${task}.`
              : 'Open it to confirm your account, and you’ll be logged in.'}
          </>
        ) : (
          <>
            If an account uses <strong className="wrap-anywhere">{email}</strong>, we sent it a link to set a new
            password.
          </>
        )}
      </p>
      {kind === 'reset' && (
        <Button fullWidth onClick={onBack}>
          Back to log in
        </Button>
      )}
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
        {kind === 'signup' && (
          <p>
            Confirmed on another device?{' '}
            <button type="button" onClick={onBack} className={TEXT_LINK}>
              Log in
            </button>
          </p>
        )}
        {resendStatus && <p>{resendStatus}</p>}
      </div>
      {/* Always there, so screen readers hear each change. */}
      <LiveRegion text={resendStatus} />
    </div>
  )
}

// The line that switches between screens ("Not a member? Join now"), from
// switchPrompt in loginFlow.js. Renders nothing when that screen has none.
export function SwitchLine({ line, switchTo }) {
  if (!line) return null
  return (
    <>
      {line.prompt}{' '}
      <button type="button" onClick={() => switchTo(line.target)} className={TEXT_LINK}>
        {line.label}
      </button>
    </>
  )
}
