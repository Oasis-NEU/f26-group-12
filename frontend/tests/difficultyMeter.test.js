import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import react from '@vitejs/plugin-react'
import { createElement } from 'react'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'

const frontendRoot = fileURLToPath(new URL('..', import.meta.url))

test('difficulty meter fills one bar per level and clamps bad values', async (context) => {
  const server = await createServer({
    appType: 'custom',
    configFile: false,
    envDir: false,
    plugins: [react()],
    root: frontendRoot,
    server: { middlewareMode: true },
  })
  context.after(() => server.close())

  const { default: DifficultyMeter } = await server.ssrLoadModule('/src/components/DifficultyMeter.jsx')
  const render = (props) => renderToStaticMarkup(createElement(DifficultyMeter, props))

  // Filled bars use text-primary, empty ones border-subtle (theme tokens).
  const four = render({ level: 4 })
  assert.equal(four.match(/bg-text-primary/g).length, 4)
  assert.equal(four.match(/bg-border-subtle/g).length, 1)
  assert.match(four, /Difficulty 4/)

  assert.match(render({ level: 9 }), /Difficulty 5/)
  assert.match(render({ level: null }), /Difficulty 1/)

  // The older `difficulty` prop, used by the map and cache detail pages.
  assert.match(render({ difficulty: 3 }), /Difficulty 3/)

  // Hiding the label keeps it for screen readers.
  assert.match(render({ level: 2, showLabel: false }), /class="sr-only">Difficulty 2</)
})
