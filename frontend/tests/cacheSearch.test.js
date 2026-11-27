import assert from 'node:assert/strict'
import test from 'node:test'
import { loadSearchableCaches, matchParts, placeName, searchSuggestions } from '../src/lib/cacheSearch.js'

const CACHES = [
  { id: 'a', title: 'Snell Study Break', location_name: 'near Snell Library' },
  { id: 'b', title: 'Quad riddle', location_name: 'Krentzman Quad' },
  { id: 'c', title: 'Library ghost', location_name: 'near Snell Library' },
  { id: 'd', title: 'Fens fox', location_name: 'Back Bay Fens' },
  { id: 'e', title: 'Under the Snell steps', location_name: null },
]

test('suggestions match names and places, best matches first', () => {
  const result = searchSuggestions(CACHES, ' snell ')
  // Name starts with it, then a word in the name, then place-only matches.
  assert.deepEqual(
    result.caches.map((cache) => cache.id),
    ['a', 'e', 'c'],
  )
  assert.deepEqual(result.places, [{ name: 'Near Snell Library', count: 2 }])
  assert.equal(result.total, 3)
  assert.equal(result.caches[0].place, 'Near Snell Library')
})

test('nothing typed, or nothing matching, suggests nothing', () => {
  assert.deepEqual(searchSuggestions(CACHES, '   '), { caches: [], places: [], total: 0 })
  assert.equal(searchSuggestions(CACHES, 'fenway').total, 0)
})

test('suggestions are capped, but the total counts every match', () => {
  const many = Array.from({ length: 8 }, (_, i) => ({ id: String(i), title: `Quad cache ${i}`, location_name: 'Quad' }))
  const result = searchSuggestions(many, 'quad')
  assert.equal(result.caches.length, 5)
  assert.equal(result.total, 8)
})

test('the matching part is split out for bold', () => {
  assert.deepEqual(matchParts('Snell Study Break', 'study'), [
    { text: 'Snell ', match: false },
    { text: 'Study', match: true },
    { text: ' Break', match: false },
  ])
  assert.deepEqual(matchParts('Fens fox', 'quad'), [{ text: 'Fens fox', match: false }])
})

test('place names get a capital first letter', () => {
  assert.equal(placeName(' near Snell Library'), 'Near Snell Library')
  assert.equal(placeName(null), '')
})

test('loading never asks for the secret code, and only active caches', async () => {
  const calls = []
  const query = {
    select: (columns) => (calls.push(['select', columns]), query),
    eq: (column, value) => (calls.push(['eq', column, value]), query),
    order: () => Promise.resolve({ data: CACHES, error: null }),
  }
  const caches = await loadSearchableCaches({ from: () => query })
  assert.equal(caches.length, 5)
  assert.doesNotMatch(calls[0][1], /secret/)
  assert.deepEqual(calls[1], ['eq', 'is_active', true])
})
