import assert from 'node:assert/strict'
import test from 'node:test'
import { mapSearchPath, readSearch, withSearch } from '../src/lib/searchQuery.js'

test('the search is read from ?q=', () => {
  assert.equal(readSearch(new URLSearchParams('q=snell')), 'snell')
  assert.equal(readSearch(new URLSearchParams('')), '')
})

test('setting the search keeps the rest of the address', () => {
  const params = new URLSearchParams('view=list')
  assert.equal(withSearch(params, 'quad').toString(), 'view=list&q=quad')
  assert.equal(withSearch(new URLSearchParams('view=list&q=quad'), '').toString(), 'view=list')
  // The original isn't changed.
  assert.equal(params.toString(), 'view=list')
})

test('Enter from another page goes to the map with the search', () => {
  assert.equal(mapSearchPath('  Snell Library '), '/map?q=Snell%20Library')
  assert.equal(mapSearchPath('   '), '/map')
})
