import assert from 'node:assert/strict'
import test from 'node:test'
import { describeCacheStats, loadMyCaches } from '../src/pages/myCachesData.js'

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
  assert.ok(calls[1][1].includes('finds(rating)'))
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

test('describeCacheStats matches the design copy', () => {
  assert.equal(
    describeCacheStats({ location_name: 'Back Bay Fens', finds: [{ rating: 4 }, { rating: 4 }] }),
    'Back Bay Fens · 2 finds · Rated 4.0 on average',
  )
  assert.equal(describeCacheStats({ location_name: null, finds: [] }), 'No finds yet')
})

test('describeCacheStats handles one find and finds without ratings', () => {
  assert.equal(describeCacheStats({ location_name: 'Quad', finds: [{ rating: null }] }), 'Quad · 1 find')
  assert.equal(
    describeCacheStats({ finds: [{ rating: 5 }, { rating: null }, { rating: 4 }] }),
    '3 finds · Rated 4.5 on average',
  )
})
