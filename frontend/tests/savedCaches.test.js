import assert from 'node:assert/strict'
import test from 'node:test'
import { loadSavedIds, saveCache, unsaveCache } from '../src/lib/savedCaches.js'

// A tiny stand-in for the Supabase client that records each call.
function fakeClient(result = { data: [], error: null }) {
  const calls = []
  const query = {
    select: (columns) => (calls.push(['select', columns]), query),
    eq: (column, value) => (calls.push(['eq', column, value]), Promise.resolve(result)),
    insert: (row) => (calls.push(['insert', row]), Promise.resolve(result)),
    delete: () => (calls.push(['delete']), query),
  }
  return { calls, client: { from: (table) => (calls.push(['from', table]), query) } }
}

test('saved ids are loaded for the signed-in person only', async () => {
  const { calls, client } = fakeClient({ data: [{ cache_id: 'a' }, { cache_id: 'b' }], error: null })
  assert.deepEqual(await loadSavedIds(client, 'user-1'), ['a', 'b'])
  assert.deepEqual(calls, [
    ['from', 'saved_caches'],
    ['select', 'cache_id'],
    ['eq', 'user_id', 'user-1'],
  ])
})

test('signed out: no saves, and no query', async () => {
  const { calls, client } = fakeClient()
  assert.deepEqual(await loadSavedIds(client, null), [])
  assert.equal(calls.length, 0)
})

test('saving sends only the cache id', async () => {
  const { calls, client } = fakeClient({ error: null })
  await saveCache(client, 'a')
  assert.deepEqual(calls, [
    ['from', 'saved_caches'],
    ['insert', { cache_id: 'a' }],
  ])
})

test('saving one that is already saved counts as done; other errors throw', async () => {
  await saveCache(fakeClient({ error: { code: '23505' } }).client, 'a')
  await assert.rejects(saveCache(fakeClient({ error: { code: '42501', message: 'denied' } }).client, 'a'))
})

test('unsaving deletes that cache', async () => {
  const { calls, client } = fakeClient({ error: null })
  await unsaveCache(client, 'a')
  assert.deepEqual(calls, [['from', 'saved_caches'], ['delete'], ['eq', 'cache_id', 'a']])
})
