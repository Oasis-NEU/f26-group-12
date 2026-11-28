// Small pieces of the log in flow that both the Log in page and the login
// dialog use. Plain functions (no React), so they're easy to test.

// Each screen's name (its heading, and the page title on /login).
export const TITLES = {
  login: 'Log in',
  code: 'Log in with a code',
  signup: 'Create your account',
  forgot: 'Reset your password',
  reset: 'Set a new password',
}

// Where the emailed links come back to. All of them open the Log in page
// (/login), even when someone started in the dialog: a link opens a new
// tab, and the page is what handles it.
//   confirm  the sign-up confirmation link. Tagged link=confirm, so an
//            expired one gets the right message, and it keeps next, so
//            confirming still ends up on the page they were on.
//   reset    the "set a new password" link
//   login    the link in the login code email (Supabase's default template
//            still has one); it logs them in and goes on to next
// next must already be safe (safeNextPath), or null.
export function loginRedirects(origin, next) {
  const confirmParams = new URLSearchParams({ link: 'confirm' })
  if (next) confirmParams.set('next', next)
  return {
    confirm: `${origin}/login?${confirmParams}`,
    reset: `${origin}/login?mode=reset`,
    login: `${origin}/login${next ? `?next=${encodeURIComponent(next)}` : ''}`,
  }
}

// The line under a screen that switches to another one, or null:
//   Log in                 "Not a member? Join now" (to sign up)
//   Sign up, code, forgot  "Already a member?" / "Rather use your
//                          password?" / "Remembered it?" + "Log in"
//   An expired reset link  "Remembered it? Log in"
// "Check your email" (sent) and setting a new password have none.
export function switchPrompt(mode, { sent = false, hasSession = false } = {}) {
  if (sent) return null
  if (mode === 'login') return { prompt: 'Not a member?', label: 'Join now', target: 'signup' }
  if (mode === 'signup') return { prompt: 'Already a member?', label: 'Log in', target: 'login' }
  if (mode === 'code') return { prompt: 'Rather use your password?', label: 'Log in', target: 'login' }
  if (mode === 'forgot' || (mode === 'reset' && !hasSession)) {
    return { prompt: 'Remembered it?', label: 'Log in', target: 'login' }
  }
  return null
}

// The screens the dialog can show. Setting a new password stays on the
// Log in page, where the emailed reset link lands.
export const DIALOG_MODES = ['login', 'code', 'signup', 'forgot']

export function dialogMode(mode) {
  return DIALOG_MODES.includes(mode) ? mode : 'login'
}

// Whether a Supabase auth event means someone just logged in, so the open
// dialog can close and finish what they were doing.
export function isNewLogin(event, session) {
  return Boolean(session) && event === 'SIGNED_IN'
}
