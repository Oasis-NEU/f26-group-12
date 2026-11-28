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

// What the dialog remembers about who was logged in when it opened (null
// if nobody), so isNewLogin can tell a real login from Supabase restoring
// the same login.
export function loginSnapshot(session) {
  if (!session?.user) return null
  return { userId: session.user.id, signedInAt: session.user.last_sign_in_at ?? null }
}

// How a session was logged in, from its access token's "amr" claim (the
// newest method): "password", "otp", "recovery" and so on. null if unknown.
export function loginMethod(session) {
  try {
    const payload = session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const amr = JSON.parse(atob(payload)).amr
    if (!Array.isArray(amr) || !amr.length) return null
    const newest = amr.reduce((a, b) => ((b.timestamp ?? 0) > (a.timestamp ?? 0) ? b : a))
    return newest.method ?? null
  } catch {
    return null
  }
}

// Whether a Supabase auth event means someone just logged in, so the open
// dialog can close and finish what they were doing. before is
// loginSnapshot() from when the dialog opened.
//
// Supabase also says SIGNED_IN when it only restores a login (e.g. when the
// tab comes back into view), so that alone isn't enough: it has to be a
// different person, or a newer login, than when the dialog opened. And a
// password-reset link's login (opened in another tab) never counts: it's
// only for setting a new password, and the Log in page logs out after it.
// A login in another tab of the same browser (e.g. the sign-up
// confirmation link) does count: it logs this tab in too.
export function isNewLogin(event, session, before = null) {
  if (event !== 'SIGNED_IN' || !session?.user) return false
  if (loginMethod(session) === 'recovery') return false
  const now = loginSnapshot(session)
  if (!before) return true
  return now.userId !== before.userId || now.signedInAt !== before.signedInAt
}

// The line under the dialog's heading saying why they're being asked, from
// the task they were in the middle of ("add Krentzman Corner to your
// favorites"), or null. Only on the screens where it helps: Log in and
// Create your account (not the code, reset or "Check your email" screens,
// which follow on from those). expired: their login ran out mid-task.
export function reasonFor(mode, task, { expired = false } = {}) {
  if (!task) return null
  if (mode === 'login') return expired ? `Your login ran out. Log in again to ${task}.` : `Log in to ${task}.`
  if (mode === 'signup' && !expired) return `Create an account to ${task}.`
  return null
}
