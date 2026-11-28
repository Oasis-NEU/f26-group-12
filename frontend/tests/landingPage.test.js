import assert from 'node:assert/strict'
import { createElement } from 'react'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import react from '@vitejs/plugin-react'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { MemoryRouter } from 'react-router'

const frontendRoot = fileURLToPath(new URL('..', import.meta.url))

// Renders the landing page to HTML, through Vite so the JSX and imports work.
async function renderLandingPage(context) {
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
  return renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/'] }, createElement(LandingPage)))
}

test('landing page renders its own header and main, the kicker, the hero, the steps, and no cache row', async (context) => {
  const markup = await renderLandingPage(context)

  assert.match(markup, /<main id="main-content"/)
  assert.match(markup, /Skip to content/)
  // The kicker says what HuskyCache is, just before the headline.
  const kicker = markup.indexOf('>Hide and find caches around campus</p>')
  assert.ok(kicker > 0)
  assert.ok(kicker < markup.indexOf('<h1'))
  // The no-break space keeps "NU community!" together on the last line.
  assert.match(markup, /<h1[^>]*>Cache in and stay connected to the NU\u00a0community!<\/h1>/)
  assert.match(markup, /student-led website/)
  // The two actions use the app's own words and go where the header goes.
  assert.match(markup, /href="\/map"[^>]*>Find a cache<\/a>/)
  assert.match(markup, /href="\/caches\/new"[^>]*>Hide a cache<\/a>/)
  // Only one red (Primary) button on the page. (The trail's red pin isn't a button.)
  assert.equal(markup.match(/<(a|button)\b[^>]*\bbg-accent\b/g)?.length, 1)
  // The Snell Library photo, not Krentzman Quad (it shows the university seal).
  assert.match(markup, /src="\/assets\/snell-library.jpeg"/)
  assert.doesNotMatch(markup, /krentzman/i)
  assert.match(markup, /fetchPriority="high"|fetchpriority="high"/)
  // The three steps, in order, in a numbered list that keeps its list role in
  // Safari, with the step number said to screen readers.
  assert.match(markup, /<ol role="list"/)
  const steps = ['Find a cache', 'Open it', 'Earn points'].map((title) => markup.indexOf(`>${title}</h3>`))
  assert.ok(steps.every((at) => at > 0))
  assert.deepEqual([...steps].sort((a, b) => a - b), steps)
  assert.match(markup, /<span class="sr-only">Step 1: <\/span>Find a cache<\/h3>/)
  // No cache row: the page loads no data.
  assert.doesNotMatch(markup, /Waiting to be found/)
  assert.doesNotMatch(markup, /See them all on the map/)
  // The old page's made-up numbers are gone.
  assert.doesNotMatch(markup, /nearby caches/)
})

test('landing page footer: what HuskyCache is, links to real pages and GitHub, no About or Contact', async (context) => {
  const markup = await renderLandingPage(context)
  const footerStart = markup.indexOf('<footer')
  assert.ok(footerStart > markup.indexOf('</main>'), 'the footer comes after <main>')
  const footer = markup.slice(footerStart, markup.indexOf('</footer>') + '</footer>'.length)

  assert.match(footer, />HuskyCache</)
  assert.match(footer, /An unofficial student project, built through the Oasis Project Series\. Not affiliated with Northeastern\./)
  assert.match(footer, /<nav aria-label="Footer"/)
  for (const [href, label] of [
    ['/map', 'Map'],
    ['/caches/new', 'Hide a cache'],
    ['/journal', 'Journal'],
    ['/leaderboard', 'Leaderboard'],
  ]) {
    assert.match(footer, new RegExp(`href="${href}"[^>]*>${label}</a>`))
  }
  // Each link group is a list Safari still reads as one.
  assert.equal(footer.match(/<ul role="list"/g)?.length, 2)
  // GitHub opens in a new tab, safely, and says so to screen readers.
  assert.match(footer, /<a href="https:\/\/github\.com\/Oasis-NEU\/f26-group-12" target="_blank" rel="noopener noreferrer"/)
  assert.match(footer, /\(opens in a new tab\)/)
  // About and Contact don't exist yet, so they aren't linked.
  assert.doesNotMatch(footer, /About|Contact/)
})
