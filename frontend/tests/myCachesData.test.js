import assert from 'node:assert/strict'
import test from 'node:test'
import { describeCacheStats, loadMyCaches, loadSecretCode } from '../src/pages/myCachesData.js'

function createSupabaseStub(result) {
  const calls = []
  const query = {
    select(columns) {
      calls.push(['select', columns])
      return this
    },
    eq(column, value) {
      calls.push(['eq', column, value])
      return this
    },
    order(column, options) {
      calls.push(['order', column, options])
      return this
    },
    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject)
    },
  }

  return {
    calls,
    client: {
      from(table) {
        calls.push(['from', table])
        return query
      },
    },
  }
}

test('loadMyCaches asks only for the signed-in user’s caches and never the secret code', async () => {
  const { calls, client } = createSupabaseStub({ data: [], error: null })

  await loadMyCaches(client, 'user-1')

  assert.deepEqual(calls[0], ['from', 'caches'])
  assert.ok(!calls[1][1].includes('secret_code'))
  // finds are own-rows only (RLS), so the embed always came back empty.
  assert.ok(!calls[1][1].includes('finds'))
  assert.deepEqual(calls[2], ['eq', 'created_by', 'user-1'])
})

test('loadMyCaches returns nothing without a user and skips the query', async () => {
  const { calls, client } = createSupabaseStub({ data: [{ id: 'x' }], error: null })

  assert.deepEqual(await loadMyCaches(client, null), [])
  assert.equal(calls.length, 0)
})

test('loadMyCaches puts active caches before taken-down ones, keeping newest first', async () => {
  const { client } = createSupabaseStub({
    data: [
      { id: 'new-down', is_active: false },
      { id: 'new-active', is_active: true },
      { id: 'old-active', is_active: true },
    ],
    error: null,
  })

  const caches = await loadMyCaches(client, 'user-1')

  assert.deepEqual(caches.map(({ id }) => id), ['new-active', 'old-active', 'new-down'])
})

test('loadMyCaches throws Supabase errors so the page can show them', async () => {
  const { client } = createSupabaseStub({ data: null, error: new Error('nope') })

  await assert.rejects(loadMyCaches(client, 'user-1'), /nope/)
})

test('describeCacheStats shows just the place, never a false "No finds yet"', () => {
  assert.equal(describeCacheStats({ location_name: 'Back Bay Fens' }), 'Back Bay Fens')
  assert.equal(describeCacheStats({ location_name: null }), '')
  assert.equal(describeCacheStats({ location_name: '   ' }), '')
  assert.ok(!describeCacheStats({ location_name: 'Quad', finds: [] }).includes('finds'))
})

// A fake client for the one-row cache_secrets lookup.
function createSecretStub(result) {
  const calls = []
  const query = {
    select(columns) {
      calls.push(['select', columns])
      return this
    },
    eq(column, value) {
      calls.push(['eq', column, value])
      return this
    },
    maybeSingle() {
      calls.push(['maybeSingle'])
      return Promise.resolve(result)
    },
  }
  return {
    calls,
    client: {
      from(table) {
        calls.push(['from', table])
        return query
      },
    },
  }
}

test('loadSecretCode reads one cache’s code from cache_secrets, not from caches', async () => {
  const { calls, client } = createSecretStub({ data: { secret_code: 'FXHNT8' }, error: null })

  assert.equal(await loadSecretCode(client, 'c1'), 'FXHNT8')
  assert.deepEqual(calls[0], ['from', 'cache_secrets'])
  assert.deepEqual(calls[1], ['select', 'secret_code'])
  assert.deepEqual(calls[2], ['eq', 'cache_id', 'c1'])
})

test('loadSecretCode throws when RLS hides the code or the request fails', async () => {
  await assert.rejects(loadSecretCode(createSecretStub({ data: null, error: null }).client, 'c1'))
  await assert.rejects(loadSecretCode(createSecretStub({ data: null, error: new Error('nope') }).client, 'c1'), /nope/)
})
