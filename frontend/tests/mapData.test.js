import assert from 'node:assert/strict'
import test from 'node:test'

async function getMapData() {
  const mapData = await import('../src/pages/mapData.js').catch(() => null)
  assert.ok(mapData, 'mapData module must exist')
  return mapData
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

function createChannelStub() {
  const subscriptions = []
  const channelNames = []
  const channel = {
    on(type, filter, callback) {
      subscriptions.push({ type, filter, callback })
      return this
    },
    subscribe(onStatus) {
      this.onStatus = onStatus
      return this
    },
  }

  return {
    channel,
    channelNames,
    subscriptions,
    client: {
      channel(name) {
        channelNames.push(name)
        return channel
      },
    },
  }
}

test('active cache query selects only public map fields', async () => {
  const { loadActiveCaches } = await getMapData()
  const cache = { id: 'cache-1', title: 'Quad riddle', latitude: 42.34, longitude: -71.09 }
  const { client, calls } = createSupabaseStub({ data: [cache], error: null })

  assert.deepEqual(await loadActiveCaches(client), [cache])
  assert.deepEqual(calls, [
    ['from', 'caches'],
    [
      'select',
      'id,title,latitude,longitude,location_name,difficulty,image',
    ],
    ['eq', 'is_active', true],
    ['order', 'created_at', { ascending: false }],
  ])
})

test('find query is scoped to the supplied user and returns cache ids', async () => {
  const { loadUserFinds } = await getMapData()
  const { client, calls } = createSupabaseStub({
    data: [{ cache_id: 'cache-1' }, { cache_id: 'cache-2' }],
    error: null,
  })

  assert.deepEqual(await loadUserFinds(client, 'user-1'), ['cache-1', 'cache-2'])
  assert.deepEqual(calls, [
    ['from', 'finds'],
    ['select', 'cache_id'],
    ['eq', 'finder_id', 'user-1'],
  ])
})

test('find query is skipped when no user is signed in', async () => {
  const { loadUserFinds } = await getMapData()
  const { client, calls } = createSupabaseStub({ data: [], error: null })

  assert.deepEqual(await loadUserFinds(client, null), [])
  assert.deepEqual(calls, [])
})

test('search composes with the selected cache filter', async () => {
  const { filterCaches } = await getMapData()
  const caches = [
    { id: 'found', title: 'Snell steps', location_name: 'Snell Library' },
    { id: 'unfound', title: 'Quad riddle', location_name: 'Krentzman Quad' },
  ]

  assert.deepEqual(filterCaches(caches, 'snell', 'all', ['found']), [caches[0]])
  assert.deepEqual(filterCaches(caches, '', 'to-find', ['found']), [caches[1]])
  assert.deepEqual(filterCaches(caches, 'quad', 'my-finds', ['found']), [])
})

test('cache query errors are surfaced to the caller', async () => {
  const { loadActiveCaches } = await getMapData()
  const error = new Error('cache access denied')
  const { client } = createSupabaseStub({ data: null, error })

  await assert.rejects(loadActiveCaches(client), error)
})

test('anonymous live map does not subscribe to row-change payloads', async () => {
  const { subscribeToUserFindChanges } = await getMapData()
  const { client, channelNames, subscriptions } = createChannelStub()

  assert.equal(subscribeToUserFindChanges(client, null, () => {}), null)
  assert.deepEqual(channelNames, [])
  assert.deepEqual(subscriptions, [])
})

test("signed-in live map subscribes only to the user's find changes", async () => {
  const { subscribeToUserFindChanges } = await getMapData()
  const { client, subscriptions } = createChannelStub()

  subscribeToUserFindChanges(client, 'user-1', () => {})

  assert.equal(subscriptions.length, 1)
  assert.deepEqual(subscriptions[0].filter, {
    event: '*',
    schema: 'public',
    table: 'finds',
    filter: 'finder_id=eq.user-1',
  })
})

test('live map subscription reports connection status', async () => {
  const { subscribeToUserFindChanges } = await getMapData()
  const { client, channel } = createChannelStub()
  const statuses = []

  subscribeToUserFindChanges(client, 'user-1', () => {}, (status) => statuses.push(status))
  channel.onStatus('CHANNEL_ERROR')

  assert.deepEqual(statuses, ['CHANNEL_ERROR'])
})
