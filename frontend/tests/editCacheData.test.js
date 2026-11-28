import assert from 'node:assert/strict'
import test from 'node:test'
import {
  bringBackCache,
  loadCacheForEdit,
  prepareCacheEdits,
  saveCacheEdits,
  takeDownCache,
} from '../src/pages/editCacheData.js'

// A fake Supabase client. Every query records its calls and resolves to the
// next result in `results`, in order.
function createSupabaseStub(results) {
  const calls = []
  let next = 0

  function makeQuery() {
    const query = {}
    for (const method of ['select', 'eq', 'gt', 'order', 'update', 'upsert', 'delete', 'maybeSingle']) {
      query[method] = (...args) => {
        calls.push([method, ...args])
        return query
      }
    }
    query.then = (resolve, reject) =>
      Promise.resolve(results[next++] ?? { data: null, error: null }).then(resolve, reject)
    return query
  }

  return {
    calls,
    client: {
      from(table) {
        calls.push(['from', table])
        return makeQuery()
      },
    },
  }
}

const validForm = {
  title: '  fens fox ',
  description: '',
  locationName: 'Back Bay Fens',
  difficulty: 3,
  position: { lat: 42.34, lng: -71.09 },
  hints: ['Follow the path along the water.', '  ', 'Look low.'],
}

test('loadCacheForEdit returns the cache, its secret code, and its hint texts in order', async () => {
  const { calls, client } = createSupabaseStub([
    { data: { id: 'c1', title: 'fens fox' }, error: null },
    { data: [{ hint_order: 1, hint_text: 'A' }, { hint_order: 2, hint_text: 'B' }], error: null },
    { data: { secret_code: 'ABC234' }, error: null },
  ])

  const result = await loadCacheForEdit(client, 'c1')

  assert.deepEqual(result, {
    cache: { id: 'c1', title: 'fens fox', secret_code: 'ABC234' },
    hints: ['A', 'B'],
  })
  assert.deepEqual(calls[0], ['from', 'caches'])
  assert.ok(!calls[1][1].includes('secret_code'), 'caches no longer has a secret_code column')
  assert.ok(calls.some((call) => call[0] === 'from' && call[1] === 'cache_secrets'))
  assert.ok(calls.some((call) => call[0] === 'order' && call[1] === 'hint_order'))
})

test('loadCacheForEdit gives a null secret code when RLS hides it', async () => {
  const { client } = createSupabaseStub([
    { data: { id: 'c1', title: 'fens fox' }, error: null },
    { data: [], error: null },
    { data: null, error: null },
  ])

  const result = await loadCacheForEdit(client, 'c1')

  assert.equal(result.cache.secret_code, null)
})

test('loadCacheForEdit returns null for a cache that does not exist', async () => {
  const { client } = createSupabaseStub([{ data: null, error: null }])

  assert.equal(await loadCacheForEdit(client, 'missing'), null)
})

test('prepareCacheEdits trims text, nulls empty optional fields, and compacts hints', () => {
  const { values, hints, errors } = prepareCacheEdits(validForm)

  assert.equal(errors, undefined)
  assert.deepEqual(values, {
    title: 'fens fox',
    description: null,
    location_name: 'Back Bay Fens',
    difficulty: 3,
    latitude: 42.34,
    longitude: -71.09,
  })
  assert.deepEqual(hints, ['Follow the path along the water.', 'Look low.'])
})

test('prepareCacheEdits never includes secret_code or is_active in the update', () => {
  const { values } = prepareCacheEdits({ ...validForm, secret_code: 'HACKED', is_active: false })

  assert.ok(!('secret_code' in values))
  assert.ok(!('is_active' in values))
})

test('prepareCacheEdits reports missing name, bad difficulty, and missing pin', () => {
  const { errors } = prepareCacheEdits({
    ...validForm,
    title: '   ',
    difficulty: 7,
    position: null,
  })

  assert.deepEqual(Object.keys(errors).sort(), ['difficulty', 'position', 'title'])
})

test('saveCacheEdits updates the cache, upserts hints 1..n, and deletes hints past n', async () => {
  const { calls, client } = createSupabaseStub([])

  await saveCacheEdits(client, 'c1', { title: 'x' }, ['A', 'B'])

  assert.ok(calls.some((call) => call[0] === 'update' && call[1].title === 'x'))
  const upsert = calls.find((call) => call[0] === 'upsert')
  assert.deepEqual(upsert[1], [
    { cache_id: 'c1', hint_order: 1, hint_text: 'A' },
    { cache_id: 'c1', hint_order: 2, hint_text: 'B' },
  ])
  assert.deepEqual(upsert[2], { onConflict: 'cache_id,hint_order' })
  assert.ok(calls.some((call) => call[0] === 'gt' && call[1] === 'hint_order' && call[2] === 2))
})

test('saveCacheEdits with no hints skips the upsert and deletes them all', async () => {
  const { calls, client } = createSupabaseStub([])

  await saveCacheEdits(client, 'c1', { title: 'x' }, [])

  assert.ok(!calls.some((call) => call[0] === 'upsert'))
  assert.ok(calls.some((call) => call[0] === 'gt' && call[2] === 0))
})

test('saveCacheEdits stops and throws if the cache update fails', async () => {
  const { calls, client } = createSupabaseStub([{ data: null, error: new Error('denied') }])

  await assert.rejects(saveCacheEdits(client, 'c1', { title: 'x' }, ['A']), /denied/)
  assert.ok(!calls.some((call) => call[0] === 'upsert'))
})

test('takeDownCache sets is_active to false instead of deleting', async () => {
  const { calls, client } = createSupabaseStub([])

  await takeDownCache(client, 'c1')

  assert.ok(calls.some((call) => call[0] === 'update' && call[1].is_active === false))
  assert.ok(!calls.some((call) => call[0] === 'delete'))
})

test('bringBackCache sets is_active back to true on that cache only', async () => {
  const { calls, client } = createSupabaseStub([])

  await bringBackCache(client, 'c1')

  assert.deepEqual(calls[0], ['from', 'caches'])
  const update = calls.find((call) => call[0] === 'update')
  assert.deepEqual(update[1], { is_active: true })
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'id' && call[2] === 'c1'))
  assert.ok(!calls.some((call) => call[0] === 'delete'))
})

test('bringBackCache throws if the update fails', async () => {
  const { client } = createSupabaseStub([{ data: null, error: new Error('denied') }])

  await assert.rejects(bringBackCache(client, 'c1'), /denied/)
})
