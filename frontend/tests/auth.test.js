import assert from 'node:assert/strict'
import test from 'node:test'
import {
  checkEmail,
  checkNewPassword,
  checkUsername,
  describeAuthError,
  isUsernameTaken,
  safeNextPath,
  signUp,
} from '../src/lib/auth.js'

test('only paths on this site count as a place to return to', () => {
  assert.equal(safeNextPath('/caches/abc/log'), '/caches/abc/log')
  assert.equal(safeNextPath('/map?x=1'), '/map?x=1')
  assert.equal(safeNextPath('https://evil.example'), null)
  assert.equal(safeNextPath('//evil.example'), null)
  assert.equal(safeNextPath('/\\evil.example'), null)
  assert.equal(safeNextPath('/login'), null)
  assert.equal(safeNextPath('/login?mode=signup'), null)
  assert.equal(safeNextPath('/loginhelp'), '/loginhelp')
  assert.equal(safeNextPath(null), null)
})

test('field checks give the message to show, or nothing', () => {
  assert.equal(checkEmail(''), 'Enter your email.')
  assert.equal(checkEmail('nope'), 'Enter an email like you@northeastern.edu.')
  assert.equal(checkEmail(' you@northeastern.edu '), '')
  assert.equal(checkNewPassword('short'), 'Passwords must be at least 8 characters.')
  assert.equal(checkNewPassword('long enough'), '')
  assert.equal(checkUsername('   '), 'Choose a username.')
  assert.equal(checkUsername('x'.repeat(31)), 'Usernames can be up to 30 characters.')
  assert.equal(checkUsername('husky_hunter'), '')
})

test('Supabase errors become a message under the right field', () => {
  assert.deepEqual(describeAuthError({ code: 'invalid_credentials' }), {
    field: 'password',
    message: 'That email and password don’t match.',
  })
  assert.equal(describeAuthError({ message: 'Database error saving new user', status: 500 }).field, 'username')
  assert.equal(describeAuthError({ status: 429 }).field, null)
  assert.match(describeAuthError({ name: 'AuthRetryableFetchError', status: 0 }).message, /couldn’t be reached/)
  assert.match(describeAuthError({}).message, /Try again/)
})

test('sign up spots an email that already has an account', async () => {
  const fake = {
    auth: { signUp: async () => ({ data: { user: { identities: [] }, session: null }, error: null }) },
  }
  await assert.rejects(
    signUp(fake, { username: 'a', email: 'a@b.co', password: 'longenough' }),
    (error) => error.code === 'user_already_exists',
  )

  const confirming = {
    auth: { signUp: async () => ({ data: { user: { identities: [{}] }, session: null }, error: null }) },
  }
  assert.deepEqual(await signUp(confirming, { username: 'a', email: 'a@b.co', password: 'longenough' }), {
    needsConfirmation: true,
  })
})

test('username check looks for an exact match in profiles', async () => {
  const calls = []
  const fake = {
    from(table) {
      calls.push(['from', table])
      return {
        select(columns) {
          calls.push(['select', columns])
          return this
        },
        eq(column, value) {
          calls.push(['eq', column, value])
          return this
        },
        maybeSingle: async () => ({ data: { id: '1' }, error: null }),
      }
    },
  }
  assert.equal(await isUsernameTaken(fake, ' husky '), true)
  assert.deepEqual(calls, [
    ['from', 'profiles'],
    ['select', 'id'],
    ['eq', 'username', 'husky'],
  ])
})
