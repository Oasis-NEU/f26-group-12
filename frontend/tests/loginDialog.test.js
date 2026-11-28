import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import react from '@vitejs/plugin-react'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { MemoryRouter } from 'react-router'
import { dialogMode, isNewLogin, loginRedirects, switchPrompt, TITLES } from '../src/components/login/loginFlow.js'
import {
  PENDING_MS,
  clearPendingFavorite,
  getPendingFavorite,
  requestFavorite,
  subscribePendingFavorite,
  takePendingFavorite,
} from '../src/components/login/pendingFavorite.js'

const frontendRoot = fileURLToPath(new URL('..', import.meta.url))

test('emailed links open the Log in page and keep the page they came from', () => {
  const links = loginRedirects('https://huskycache.test', '/caches/abc?x=1')
  assert.equal(links.confirm, 'https://huskycache.test/login?link=confirm&next=%2Fcaches%2Fabc%3Fx%3D1')
  assert.equal(links.reset, 'https://huskycache.test/login?mode=reset')
  assert.equal(links.login, 'https://huskycache.test/login?next=%2Fcaches%2Fabc%3Fx%3D1')

  const plain = loginRedirects('https://huskycache.test', null)
  assert.equal(plain.confirm, 'https://huskycache.test/login?link=confirm')
  assert.equal(plain.login, 'https://huskycache.test/login')
})

test('each screen has the right switch line, and none after sending an email', () => {
  assert.deepEqual(switchPrompt('login'), { prompt: 'Not a member?', label: 'Join now', target: 'signup' })
  assert.equal(switchPrompt('signup').prompt, 'Already a member?')
  assert.equal(switchPrompt('code').prompt, 'Rather use your password?')
  assert.equal(switchPrompt('forgot').prompt, 'Remembered it?')
  assert.equal(switchPrompt('forgot').target, 'login')
  // An expired reset link offers Log in; a working one (logged in) doesn't.
  assert.equal(switchPrompt('reset', { hasSession: false }).label, 'Log in')
  assert.equal(switchPrompt('reset', { hasSession: true }), null)
  assert.equal(switchPrompt('login', { sent: true }), null)
  assert.equal(TITLES.code, 'Log in with a code')
})

test('the dialog shows every screen except setting a new password', () => {
  for (const mode of ['login', 'code', 'signup', 'forgot']) assert.equal(dialogMode(mode), mode)
  assert.equal(dialogMode('reset'), 'login')
  assert.equal(dialogMode(undefined), 'login')
  assert.equal(dialogMode('nonsense'), 'login')
})

test('only a new login closes the dialog', () => {
  const session = { user: { id: 'u1' } }
  assert.equal(isNewLogin('SIGNED_IN', session), true)
  assert.equal(isNewLogin('SIGNED_IN', null), false)
  assert.equal(isNewLogin('TOKEN_REFRESHED', session), false)
  assert.equal(isNewLogin('INITIAL_SESSION', null), false)
  assert.equal(isNewLogin('SIGNED_OUT', null), false)
})

test('a heart tapped before logging in is favorited once, by one heart', () => {
  clearPendingFavorite()
  let changes = 0
  const unsubscribe = subscribePendingFavorite(() => {
    changes += 1
  })

  requestFavorite('cache-1', 1000)
  assert.equal(getPendingFavorite(), 'cache-1')
  // Another cache's heart doesn't take it.
  assert.equal(takePendingFavorite('cache-2', 1500), false)
  assert.equal(getPendingFavorite(), 'cache-1')
  // The first heart for that cache does; a second one (the same cache shown
  // twice) doesn't.
  assert.equal(takePendingFavorite('cache-1', 1500), true)
  assert.equal(takePendingFavorite('cache-1', 1600), false)
  assert.equal(getPendingFavorite(), null)
  assert.equal(changes, 2)

  unsubscribe()
  requestFavorite('cache-3', 0)
  assert.equal(changes, 2)
  clearPendingFavorite()
})

test('a pending favorite that waited too long is dropped', () => {
  requestFavorite('cache-1', 0)
  assert.equal(takePendingFavorite('cache-1', PENDING_MS + 1), false)
  assert.equal(getPendingFavorite(), null)
})

test('the Log in page and the dialog render the shared screens', async (context) => {
  const server = await createServer({
    appType: 'custom',
    configFile: false,
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('http://127.0.0.1:54321'),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('test-anon-key'),
    },
    envDir: false,
    plugins: [react()],
    root: frontendRoot,
    server: { middlewareMode: true, hmr: false },
  })
  context.after(() => server.close())

  const { LoginForm, SignUpForm } = await server.ssrLoadModule('/src/components/login/LoginScreens.jsx')
  const { DIALOG_SCREEN, LoginScreenContext } = await server.ssrLoadModule('/src/components/login/loginScreenContext.js')
  const props = { email: '', onEmailChange: () => {}, confirmRedirect: '', switchTo: () => {} }

  // On the page: an <h1> and the plain ids.
  const page = renderToStaticMarkup(createElement(LoginForm, props))
  assert.match(page, /<h1 id="login-heading"/)
  assert.match(page, /id="login-email"/)
  assert.match(page, /Email me a code instead/)

  // In the dialog: an <h2> (the page has its own <h1>) and prefixed ids.
  const dialog = renderToStaticMarkup(
    createElement(LoginScreenContext.Provider, { value: DIALOG_SCREEN }, createElement(SignUpForm, { ...props, onSent: () => {} })),
  )
  assert.match(dialog, /<h2 id="dialog-login-heading"/)
  assert.match(dialog, /id="dialog-signup-username"/)
  assert.doesNotMatch(dialog, /id="signup-email"/)

  // The provider draws a closed <dialog> named by the screen's heading.
  const { default: LoginDialogProvider } = await server.ssrLoadModule('/src/components/login/LoginDialogProvider.jsx')
  const shell = renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(LoginDialogProvider, null, createElement('p', null, 'page'))),
  )
  assert.match(shell, /<p>page<\/p><dialog aria-labelledby="dialog-login-heading"/)
  assert.doesNotMatch(shell, /<dialog[^>]* open(=|>| )/)
  assert.match(shell, /<\/dialog>$/)
})
