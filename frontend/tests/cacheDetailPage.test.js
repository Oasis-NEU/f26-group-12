import assert from 'node:assert/strict'
import { createElement } from 'react'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import react from '@vitejs/plugin-react'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { MemoryRouter, Route, Routes } from 'react-router'

const frontendRoot = fileURLToPath(new URL('..', import.meta.url))

test('cache detail route renders an accessible loading state without sample data', async (context) => {
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
    server: { middlewareMode: true },
  })
  context.after(() => server.close())

  const { default: CacheDetailPage } = await server.ssrLoadModule(
    '/src/pages/CacheDetailPage.jsx',
  )
  const markup = renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: ['/caches/cache-123'] },
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: '/caches/:cacheId',
          element: createElement(CacheDetailPage),
        }),
      ),
    ),
  )

  assert.match(markup, /role="status"/)
  assert.match(markup, /Loading cache/)
  assert.doesNotMatch(markup, /Quad riddle/)
})
