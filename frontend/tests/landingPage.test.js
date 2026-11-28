import assert from 'node:assert/strict'
import { createElement } from 'react'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import react from '@vitejs/plugin-react'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { MemoryRouter } from 'react-router'

const frontendRoot = fileURLToPath(new URL('..', import.meta.url))

test('landing page renders its own header and main, the hero, the steps, and no made-up stats', async (context) => {
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

  const { default: LandingPage } = await server.ssrLoadModule('/src/pages/LandingPage.jsx')
  const markup = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/'] }, createElement(LandingPage)))

  assert.match(markup, /<main id="main-content"/)
  assert.match(markup, /Skip to content/)
  assert.match(markup, /<h1[^>]*>Cache in and stay connected to the NU community!<\/h1>/)
  // The two actions use the app's own words and go where the header goes.
  assert.match(markup, /href="\/map"[^>]*>Find a cache<\/a>/)
  assert.match(markup, /href="\/caches\/new"[^>]*>Hide a cache<\/a>/)
  // Only one red (Primary) button on the page.
  assert.equal(markup.match(/bg-accent /g)?.length, 1)
  // The Snell Library photo, not Krentzman Quad (it shows the university seal).
  assert.match(markup, /src="\/assets\/snell-library.jpeg"/)
  assert.doesNotMatch(markup, /krentzman/i)
  assert.match(markup, /fetchPriority="high"|fetchpriority="high"/)
  // The three steps, in order.
  const steps = ['Find a cache', 'Open it', 'Earn points'].map((title) => markup.indexOf(`>${title}</h3>`))
  assert.ok(steps.every((at) => at > 0))
  assert.deepEqual([...steps].sort((a, b) => a - b), steps)
  // The old page's made-up numbers are gone.
  assert.doesNotMatch(markup, /nearby caches/)
})
