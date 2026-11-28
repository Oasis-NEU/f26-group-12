import assert from 'node:assert/strict'
import test from 'node:test'
import { FEATURED_COUNT, pickFeaturedCaches } from '../src/pages/landingData.js'

const cache = (id, image = null) => ({ id, title: `Cache ${id}`, image })

test('picks three caches by default', () => {
  const picked = pickFeaturedCaches([cache('a'), cache('b'), cache('c'), cache('d')])
  assert.equal(FEATURED_COUNT, 3)
  assert.deepEqual(
    picked.map((c) => c.id),
    ['a', 'b', 'c'],
  )
})

test('caches with a photo come first, each group keeping its order', () => {
  const picked = pickFeaturedCaches([cache('a'), cache('b', 'b.jpg'), cache('c'), cache('d', 'd.jpg')])
  assert.deepEqual(
    picked.map((c) => c.id),
    ['b', 'd', 'a'],
  )
})

test('handles fewer caches than asked for, and none at all', () => {
  assert.deepEqual(
    pickFeaturedCaches([cache('a')]).map((c) => c.id),
    ['a'],
  )
  assert.deepEqual(pickFeaturedCaches([]), [])
  assert.deepEqual(pickFeaturedCaches(null), [])
})
