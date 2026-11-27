import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CODE_ALPHABET,
  checkCacheForm,
  createCache,
  describeCreateError,
  generateSecretCode,
  readDraft,
  readHidden,
  saveDraft,
  saveHidden,
} from '../src/lib/hideCache.js'

test('secret codes are 6 characters from the slip alphabet', () => {
  for (let i = 0; i < 200; i += 1) {
    const code = generateSecretCode()
    assert.equal(code.length, 6)
    assert.ok([...code].every((char) => CODE_ALPHABET.includes(char)), code)
    assert.doesNotMatch(code, /[0O1IL]/)
  }
  // The same random numbers always give the same code.
  assert.equal(generateSecretCode((array) => array.fill(0)), 'AAAAAA')
  assert.equal(generateSecretCode((array) => array.fill(30)), '999999')
})

test('the form needs a name, a spot and a difficulty', () => {
  assert.deepEqual(checkCacheForm({ title: ' ', position: null, difficulty: null }), {
    title: 'Give your cache a name.',
    position: 'Place the pin on the map, or use your current location.',
    difficulty: 'Pick a difficulty.',
  })
  assert.deepEqual(checkCacheForm({ title: 'Fens fox', position: { lat: 1, lng: 2 }, difficulty: 3 }), {})
})

test('createCache sends tidy values and returns the id and code', async () => {
  const calls = []
  const fake = {
    rpc: async (name, args) => {
      calls.push([name, args])
      return { data: { cache_id: 'c1', secret_code: 'K7MQ2X' }, error: null }
    },
  }
  const saved = await createCache(fake, {
    title: ' Fens fox ',
    description: '  ',
    locationName: 'Back Bay Fens',
    position: { lat: 42.34, lng: -71.09 },
    difficulty: 3,
    hints: ['Under the bridge', '  ', 'Look up'],
    secretCode: 'K7MQ2X',
  })
  assert.deepEqual(saved, { cacheId: 'c1', secretCode: 'K7MQ2X' })
  assert.deepEqual(calls, [
    [
      'create_cache',
      {
        p_title: 'Fens fox',
        p_latitude: 42.34,
        p_longitude: -71.09,
        p_difficulty: 3,
        p_description: null,
        p_location_name: 'Back Bay Fens',
        p_hints: ['Under the bridge', 'Look up'],
        p_secret_code: 'K7MQ2X',
      },
    ],
  ])
})

test('create_cache errors become what the page shows', () => {
  assert.equal(describeCreateError({ message: 'You need to be logged in to add a cache.' }).kind, 'signed-out')
  assert.equal(describeCreateError(Object.assign(new Error('aborted'), { name: 'AbortError' })).kind, 'timeout')
  assert.equal(describeCreateError(new TypeError('Failed to fetch')).kind, 'network')
  assert.equal(describeCreateError({ message: 'something else' }).kind, 'other')
})

test('a saved draft comes back cleaned up', () => {
  const store = new Map()
  globalThis.window = {
    sessionStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
    },
  }
  saveDraft({
    title: 'Fens fox',
    position: { lat: 42.3, lng: -71.1 },
    difficulty: 9,
    hints: ['a', 'b', 'c', 'd'],
    secretCode: 'OOPS10',
  })
  const draft = readDraft()
  assert.equal(draft.title, 'Fens fox')
  assert.deepEqual(draft.position, { lat: 42.3, lng: -71.1 })
  assert.equal(draft.difficulty, null)
  assert.deepEqual(draft.hints, ['a', 'b', 'c'])
  assert.equal(draft.secretCode, null)
  delete globalThis.window
})

test('"Cache hidden!" comes back for the tab, and a broken one is ignored', () => {
  const store = new Map()
  globalThis.window = {
    sessionStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
    },
  }
  saveHidden({ cacheId: 'c1', secretCode: 'K7MQ2X', title: 'Fens fox' })
  assert.deepEqual(readHidden(), { cacheId: 'c1', secretCode: 'K7MQ2X', title: 'Fens fox' })
  saveHidden({ cacheId: 'c1', secretCode: 'K7', title: 'Fens fox' })
  assert.equal(readHidden(), null)
  delete globalThis.window
})
