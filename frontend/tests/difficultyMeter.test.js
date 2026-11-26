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
  const render = (difficulty) => renderToStaticMarkup(createElement(DifficultyMeter, { difficulty }))

  const four = render(4)
  assert.equal(four.match(/bg-black/g).length, 4)
  assert.equal(four.match(/bg-\[#f5f5f5\]/g).length, 1)
  assert.match(four, /Difficulty 4/)

  assert.match(render(9), /Difficulty 5/)
  assert.match(render(null), /Difficulty 1/)
})
