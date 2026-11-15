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
  }
  const { client, calls } = createSupabaseStub({ data: cache, error: null })

  assert.deepEqual(await loadCacheDetails(client, 'cache-1'), cache)
  assert.deepEqual(calls, [
    ['from', 'caches'],
    ['select', 'id,title,description,location_name,difficulty,image,is_active'],
    ['eq', 'id', 'cache-1'],
    ['maybeSingle'],
  ])
})

test('find status is scoped to the current user and cache', async () => {
  const { loadUserFindStatus } = await getCacheDetailData()
  const { client, calls } = createSupabaseStub({
    data: { cache_id: 'cache-1' },
    error: null,
  })

  assert.equal(await loadUserFindStatus(client, 'cache-1', 'user-1'), true)
  assert.deepEqual(calls, [
    ['from', 'finds'],
    ['select', 'cache_id'],
    ['eq', 'finder_id', 'user-1'],
    ['eq', 'cache_id', 'cache-1'],
    ['maybeSingle'],
  ])
})

test('anonymous find status skips Supabase', async () => {
  const { loadUserFindStatus } = await getCacheDetailData()
  const { client, calls } = createSupabaseStub({ data: null, error: null })

  assert.equal(await loadUserFindStatus(client, 'cache-1', null), false)
  assert.deepEqual(calls, [])
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
  const { loadCacheDetails, loadHint, loadUserFindStatus } = await getCacheDetailData()
  const error = new Error('read access denied')
  const cacheClient = createSupabaseStub({ data: null, error })
  const findClient = createSupabaseStub({ data: null, error })
  const hintClient = createSupabaseStub({ data: null, error })

  await assert.rejects(loadCacheDetails(cacheClient.client, 'cache-1'), error)
  await assert.rejects(loadUserFindStatus(findClient.client, 'cache-1', 'user-1'), error)
  await assert.rejects(loadHint(hintClient.client, 'cache-1', 1), error)
})
