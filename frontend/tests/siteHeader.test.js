import assert from 'node:assert/strict'
import { createElement } from 'react'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import react from '@vitejs/plugin-react'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { MemoryRouter } from 'react-router'

const frontendRoot = fileURLToPath(new URL('..', import.meta.url))

test('site header renders its brand, navigation, active link, and mobile menu control', async (context) => {
  const server = await createServer({
    appType: 'custom',
    configFile: false,
    // SiteHeader now checks who is logged in, so it needs (fake) Supabase keys.
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('http://127.0.0.1:54321'),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('test-anon-key'),
    },
    envDir: false,
    plugins: [react()],
    root: frontendRoot,
    server: { middlewareMode: true },
  })
  context.after(() => server.close())

  const { default: SiteHeader } = await server.ssrLoadModule('/src/components/SiteHeader.jsx')
  const markup = renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: ['/map'] },
      createElement(SiteHeader),
    ),
  )

  // "Log in" / the avatar only appear after the login check, which runs in
  // the browser, so they aren't part of this first render.
  for (const label of ['HuskyCache', 'Map', 'Hide a cache', 'Journal', 'Leaderboard']) {
    assert.ok(markup.includes(label), `header should include ${label}`)
  }
  assert.match(markup, /aria-current="page"/)
  assert.match(markup, /aria-label="Open navigation menu"/)
  assert.match(markup, /aria-expanded="false"/)
})

test('cache detail shell matches only cache detail routes', async () => {
  const layoutRoutes = await import('../src/components/layoutRoutes.js').catch(() => null)
  assert.ok(layoutRoutes, 'layoutRoutes module must exist')

  const { isCacheDetailPath } = layoutRoutes
  assert.equal(isCacheDetailPath('/caches/cache-123'), true)
  assert.equal(isCacheDetailPath('/caches/new'), false)
  assert.equal(isCacheDetailPath('/caches/cache-123/log'), false)
  assert.equal(isCacheDetailPath('/caches/cache-123/edit'), false)
  assert.equal(isCacheDetailPath('/journal'), false)
})

test('cache edit shell matches only cache edit routes', async () => {
  const { isCacheEditPath } = await import('../src/components/layoutRoutes.js')
  assert.equal(isCacheEditPath('/caches/cache-123/edit'), true)
  assert.equal(isCacheEditPath('/caches/cache-123'), false)
  assert.equal(isCacheEditPath('/caches/cache-123/log'), false)
  assert.equal(isCacheEditPath('/caches/new'), false)
})
