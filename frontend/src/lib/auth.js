// Logging in, signing up and resetting a password, for the login page.
// Each function takes the Supabase client (like the page data files do),
// so tests can pass in a fake one.
//
// Nothing here reads or stores secret codes or locations. Sign-up passes the
// username along; the database's signup trigger (handle_new_user) creates
// the profile from it, so this code never inserts into profiles.

export const PASSWORD_MIN_LENGTH = 8
export const USERNAME_MAX_LENGTH = 30

// Where to send someone after they log in, from a ?next=... link. Only paths
// on this site count ("/caches/abc/log"), so a link can't send someone to
// another website after they log in. Anything else gives null.
export function safeNextPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/')) return null
  // "//evil.com" and "/\evil.com" are treated as other sites by browsers.
  if (value.startsWith('//') || value.startsWith('/\\')) return null
  // Going "back" to the login page would just show it again.
  if (/^\/login(?:[?#/]|$)/.test(value)) return null
  return value
}

// Checks before anything is sent. Each returns '' when the value is fine,
// or the message to show under the field.
export function checkEmail(email) {
  const value = email.trim()
  if (!value) return 'Enter your email.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter an email like you@northeastern.edu.'
  return ''
}

export function checkNewPassword(password) {
  if (!password) return 'Choose a password.'
  if (password.length < PASSWORD_MIN_LENGTH) return `Passwords must be at least ${PASSWORD_MIN_LENGTH} characters.`
  return ''
}

export function checkUsername(username) {
  const value = username.trim()
  if (!value) return 'Choose a username.'
  if (value.length > USERNAME_MAX_LENGTH) return `Usernames can be up to ${USERNAME_MAX_LENGTH} characters.`
  return ''
}

// Turns a Supabase error into a message, and the field it's about
// ('email', 'password', 'username'), or null for the whole form. Errors show
// under the field they're about, as the Figma note asks.
export function describeAuthError(error) {
  const code = error?.code
  const message = String(error?.message ?? '')

  if (code === 'invalid_credentials') {
    return { field: 'password', message: 'That email and password don’t match.' }
  }
  if (code === 'email_not_confirmed') {
    return { field: 'email', message: 'Confirm your email first: open the link we sent when you signed up.' }
  }
  if (code === 'user_already_exists' || code === 'email_exists') {
    return { field: 'email', message: 'That email already has an account. Log in instead.' }
  }
  if (code === 'email_address_invalid') {
    return { field: 'email', message: 'Enter an email like you@northeastern.edu.' }
  }
  if (code === 'weak_password') {
    return { field: 'password', message: 'That password is too easy to guess. Try a longer one.' }
  }
  if (code === 'same_password') {
    return { field: 'password', message: 'That’s your current password. Choose a new one.' }
  }
  // The signup trigger can't create the profile when the username is taken,
  // and Supabase reports that as a general database error.
  if (message.includes('Database error saving new user')) {
    return { field: 'username', message: 'That username is taken.' }
  }
  if (error?.status === 429 || code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') {
    return { field: null, message: 'Too many tries. Wait a minute, then try again.' }
  }
  // No answer at all: the phone is offline or Supabase can't be reached.
  if (error?.status === 0 || error?.name === 'AuthRetryableFetchError' || error instanceof TypeError) {
    return { field: null, message: 'HuskyCache couldn’t be reached. Check your connection and try again.' }
  }
  return { field: null, message: 'That didn’t work. Try again in a moment.' }
}

// True if another account already uses this username. Profiles are public
// (anyone can read usernames), so this works before logging in.
export async function isUsernameTaken(supabase, username) {
  const { data, error } = await supabase.from('profiles').select('id').eq('username', username.trim()).maybeSingle()
  if (error) throw error
  return Boolean(data)
}

export async function logIn(supabase, { email, password }) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
}

// Creates the account. Returns { needsConfirmation: true } when Supabase is
// waiting for the person to confirm their email (the "Check your email"
// screen); otherwise they're logged in already.
export async function signUp(supabase, { username, email, password, redirectTo }) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { username: username.trim() }, emailRedirectTo: redirectTo },
  })
  if (error) throw error
  // With email confirmation on, Supabase doesn't say "this email is taken";
  // it returns a user with no identities instead.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw Object.assign(new Error('That email already has an account.'), { code: 'user_already_exists' })
  }
  return { needsConfirmation: !data.session }
}

// Sends the confirmation email again.
export async function resendConfirmation(supabase, { email, redirectTo }) {
  const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: redirectTo } })
  if (error) throw error
}

// Emails a link to set a new password. It opens redirectTo, already logged in.
export async function sendPasswordReset(supabase, { email, redirectTo }) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
  if (error) throw error
}

export async function saveNewPassword(supabase, password) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

export async function logOut(supabase) {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
