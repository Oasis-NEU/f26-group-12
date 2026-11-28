import assert from 'node:assert/strict'
import { createElement } from 'react'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import react from '@vitejs/plugin-react'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { MemoryRouter } from 'react-router'

const frontendRoot = fileURLToPath(new URL('..', import.meta.url))

test('leaderboard page renders its own header, main and a loading state first', async (context) => {
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

  const { default: LeaderboardPage } = await server.ssrLoadModule('/src/pages/LeaderboardPage.jsx')
  const markup = renderToStaticMarkup(
    createElement(MemoryRouter, { initialEntries: ['/leaderboard'] }, createElement(LeaderboardPage)),
  )

  assert.match(markup, /<main id="main-content"/)
  assert.match(markup, /Skip to content/)
  assert.match(markup, /<h1[^>]*>Leaderboard<\/h1>/)
  assert.match(markup, /role="status"/)
  assert.match(markup, /Loading the leaderboard/)
})
