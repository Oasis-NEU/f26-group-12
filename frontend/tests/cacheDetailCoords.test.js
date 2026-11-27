import assert from 'node:assert/strict'
import test from 'node:test'
import { cacheCoordinates } from '../src/pages/cacheDetail/coords.js'

test('real coordinates come back as numbers', () => {
  assert.deepEqual(cacheCoordinates({ latitude: '42.3398', longitude: -71.0892 }), { lat: 42.3398, lng: -71.0892 })
})

test('missing or out-of-range coordinates give null (no map, no directions)', () => {
  assert.equal(cacheCoordinates({ latitude: null, longitude: null }), null)
  assert.equal(cacheCoordinates({ latitude: 'abc', longitude: 10 }), null)
  assert.equal(cacheCoordinates({ latitude: 91, longitude: 0 }), null)
  assert.equal(cacheCoordinates({ latitude: 0, longitude: -181 }), null)
})
