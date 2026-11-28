import assert from 'node:assert/strict'
import test from 'node:test'
import {
  foundDateText,
  journalTotals,
  loadFavoriteCaches,
  loadJournalFinds,
  saveFindRating,
} from '../src/lib/journal.js'

// A tiny stand-in for the Supabase client that records each call. Every
// method returns the query again, and awaiting it gives `result`.
function fakeClient(result = { data: [], error: null }) {
  const calls = []
  const query = {
    select: (columns) => (calls.push(['select', columns]), query),
    eq: (column, value) => (calls.push(['eq', column, value]), query),
    order: (column, options) => (calls.push(['order', column, options]), query),
    update: (values) => (calls.push(['update', values]), query),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  }
  return { calls, client: { from: (table) => (calls.push(['from', table]), query) } }
}

test('finds load newest first, with the cache, and never ask for secret_code', async () => {
  const { calls, client } = fakeClient({
    data: [
      {
        id: 7,
        created_at: '2026-10-30T15:00:00Z',
        rating: null,
        journal_note: 'Took two minutes',
        photo: null,
        caches: { id: 'c1', title: 'Mint tin', location_name: 'near Snell', difficulty: 2, image: null, is_active: true },
      },
      // A taken-down cache: finders can't read it, so it comes back null.
      { id: 6, created_at: '2026-10-22T15:00:00Z', rating: 4, journal_note: null, photo: null, caches: null },
    ],
    error: null,
  })
  const finds = await loadJournalFinds(client, 'user-1')
  assert.deepEqual(calls[0], ['from', 'finds'])
  assert.deepEqual(calls[2], ['eq', 'finder_id', 'user-1'])
  assert.deepEqual(calls[3], ['order', 'created_at', { ascending: false }])
  assert.doesNotMatch(calls[1][1], /secret/)
  assert.match(calls[1][1], /caches\(id,title,location_name,difficulty,image,is_active\)/)
  assert.equal(finds[0].note, 'Took two minutes')
  assert.equal(finds[0].cache.title, 'Mint tin')
  assert.equal(finds[1].cache, null)
  assert.equal(finds[1].note, '')
  assert.equal(finds[1].rating, 4)
})

test('signed out: no finds, no favorites, and no query', async () => {
  const { calls, client } = fakeClient()
  assert.deepEqual(await loadJournalFinds(client, null), [])
  assert.deepEqual(await loadFavoriteCaches(client, null), [])
  assert.equal(calls.length, 0)
})

test('a failed load throws, so the page can offer to try again', async () => {
  const { client } = fakeClient({ data: null, error: { message: 'boom' } })
  await assert.rejects(loadJournalFinds(client, 'user-1'))
  await assert.rejects(loadFavoriteCaches(client, 'user-1'))
})

test('favorites come from saved_caches, newest first, without taken-down caches', async () => {
  const live = { id: 'a', title: 'A', location_name: null, difficulty: 1, image: null, is_active: true }
  const { calls, client } = fakeClient({
    data: [{ caches: live }, { caches: null }, { caches: { ...live, id: 'b', is_active: false } }],
    error: null,
  })
  assert.deepEqual(await loadFavoriteCaches(client, 'user-1'), [live])
  assert.deepEqual(calls[0], ['from', 'saved_caches'])
  assert.doesNotMatch(calls[1][1], /secret/)
  assert.deepEqual(calls[2], ['eq', 'user_id', 'user-1'])
  assert.deepEqual(calls[3], ['order', 'created_at', { ascending: false }])
})

test('rating a find sends only the rating, for that find', async () => {
  const { calls, client } = fakeClient({ data: [{ id: 7, rating: 4 }], error: null })
  assert.equal(await saveFindRating(client, { findId: 7, rating: 4 }), 4)
  assert.deepEqual(calls.slice(0, 3), [
    ['from', 'finds'],
    ['update', { rating: 4 }],
    ['eq', 'id', 7],
  ])
})

test('a rating that changed no row, errored, or is out of range counts as not saved', async () => {
  await assert.rejects(saveFindRating(fakeClient({ data: [], error: null }).client, { findId: 7, rating: 4 }))
  await assert.rejects(saveFindRating(fakeClient({ data: null, error: { message: 'denied' } }).client, { findId: 7, rating: 4 }))
  const { calls, client } = fakeClient()
  await assert.rejects(saveFindRating(client, { findId: 7, rating: 6 }))
  await assert.rejects(saveFindRating(client, { findId: 7, rating: 0 }))
  assert.equal(calls.length, 0)
})

test('points are the found caches’ difficulties added up', () => {
  const finds = [{ cache: { difficulty: 2 } }, { cache: { difficulty: 1 } }, { cache: null }]
  assert.deepEqual(journalTotals(finds), { points: 3, found: 3 })
  assert.deepEqual(journalTotals([]), { points: 0, found: 0 })
})

test('found dates show the year only once it is needed', () => {
  const now = new Date('2026-11-27T12:00:00')
  assert.equal(foundDateText('2026-10-30T12:00:00', now), 'Found Oct 30')
  assert.equal(foundDateText('2025-10-30T12:00:00', now), 'Found Oct 30, 2025')
})
