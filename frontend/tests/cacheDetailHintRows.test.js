import assert from 'node:assert/strict'
import test from 'node:test'
import { getHintRows, hintsLeftText } from '../src/pages/cacheDetail/hintRows.js'

test('only the next hint after the revealed ones can be opened', () => {
  const rows = getHintRows(3, { 1: 'First hint' }, null)

  assert.deepEqual(
    rows.map(({ order, revealed, canReveal }) => ({ order, revealed, canReveal })),
    [
      { order: 1, revealed: true, canReveal: false },
      { order: 2, revealed: false, canReveal: true },
      { order: 3, revealed: false, canReveal: false },
    ],
  )
  assert.equal(rows[0].text, 'First hint')
  assert.equal(rows[1].text, undefined)
})

test('the hint being fetched is marked as revealing', () => {
  const rows = getHintRows(3, { 1: 'First hint' }, 2)
  assert.deepEqual(
    rows.map((row) => row.revealing),
    [false, true, false],
  )
})

test('hints-left text counts down and handles no hints', () => {
  assert.equal(hintsLeftText(3, 1), '2 hints left')
  assert.equal(hintsLeftText(3, 2), '1 hint left')
  assert.equal(hintsLeftText(3, 3), 'All hints revealed')
  assert.equal(hintsLeftText(0, 0), '')
})
