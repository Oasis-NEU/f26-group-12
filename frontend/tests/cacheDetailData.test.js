import assert from 'node:assert/strict'
import test from 'node:test'

async function getCacheDetailData() {
  const module = await import('../src/pages/cacheDetailData.js').catch(() => null)
  assert.ok(module, 'cacheDetailData module must exist')
  return module
}

function createSupabaseStub(result) {
  const calls = []
  const query = {
    select(columns, options) {
      calls.push(options ? ['select', columns, options] : ['select', columns])
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
    // Lets a query be awaited without maybeSingle (used by the count query).
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

test('cache detail query selects only safe fields', async () => {
  const { loadCacheDetails } = await getCacheDetailData()
  const cache = {
    id: 'cache-1',
    title: 'Quad riddle',
    description: 'Find me near the quad.',
    location_name: 'Krentzman Quad',
    difficulty: 4,
    image: 'https://example.test/cache.jpg',
    is_active: true,
    created_by: 'user-9',
    latitude: 42.3398,
    longitude: -71.0892,
  }
  const { client, calls } = createSupabaseStub({ data: cache, error: null })

  assert.deepEqual(await loadCacheDetails(client, 'cache-1'), cache)
  assert.deepEqual(calls, [
    ['from', 'caches'],
    ['select', 'id,title,description,location_name,difficulty,image,is_active,created_by,latitude,longitude'],
    ['eq', 'id', 'cache-1'],
    ['maybeSingle'],
  ])
})

test('find lookup is scoped to the current user and cache', async () => {
  const { loadUserFind } = await getCacheDetailData()
  const find = { created_at: '2026-10-30T15:00:00Z' }
  const { client, calls } = createSupabaseStub({ data: find, error: null })

  assert.deepEqual(await loadUserFind(client, 'cache-1', 'user-1'), find)
  assert.deepEqual(calls, [
    ['from', 'finds'],
    ['select', 'created_at'],
    ['eq', 'finder_id', 'user-1'],
    ['eq', 'cache_id', 'cache-1'],
    ['maybeSingle'],
  ])
})

test('anonymous find lookup skips Supabase', async () => {
  const { loadUserFind } = await getCacheDetailData()
  const { client, calls } = createSupabaseStub({ data: null, error: null })

  assert.equal(await loadUserFind(client, 'cache-1', null), null)
  assert.deepEqual(calls, [])
})

test('hint count asks for a count only, never hint text', async () => {
  const { loadHintCount } = await getCacheDetailData()
  const { client, calls } = createSupabaseStub({ count: 3, error: null })

  assert.equal(await loadHintCount(client, 'cache-1'), 3)
  assert.deepEqual(calls, [
    ['from', 'hints'],
    ['select', 'hint_order', { count: 'exact', head: true }],
    ['eq', 'cache_id', 'cache-1'],
  ])
})

test('hint query fetches only the requested order', async () => {
  const { loadHint } = await getCacheDetailData()
  const hint = { hint_order: 2, hint_text: 'Look beside the brick wall.' }
  const { client, calls } = createSupabaseStub({ data: hint, error: null })

  assert.deepEqual(await loadHint(client, 'cache-1', 2), hint)
  assert.deepEqual(calls, [
    ['from', 'hints'],
    ['select', 'hint_order,hint_text'],
    ['eq', 'cache_id', 'cache-1'],
    ['eq', 'hint_order', 2],
    ['maybeSingle'],
  ])
})

test('cache, find, and hint query errors are surfaced', async () => {
  const { loadCacheDetails, loadHint, loadHintCount, loadUserFind } = await getCacheDetailData()
  const error = new Error('read access denied')
  const cacheClient = createSupabaseStub({ data: null, error })
  const findClient = createSupabaseStub({ data: null, error })
  const hintClient = createSupabaseStub({ data: null, error })
  const countClient = createSupabaseStub({ count: null, error })

  await assert.rejects(loadCacheDetails(cacheClient.client, 'cache-1'), error)
  await assert.rejects(loadUserFind(findClient.client, 'cache-1', 'user-1'), error)
  await assert.rejects(loadHint(hintClient.client, 'cache-1', 1), error)
  await assert.rejects(loadHintCount(countClient.client, 'cache-1'), error)
})

test('found date reads like "Oct 30, 2026"', async () => {
  const { formatFoundDate } = await getCacheDetailData()
  // Midday UTC so the date is the same in every US time zone.
  assert.equal(formatFoundDate('2026-10-30T16:00:00Z'), 'Oct 30, 2026')
})
