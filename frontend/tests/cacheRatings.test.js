import assert from 'node:assert/strict'
import test from 'node:test'
import { loadCacheRatings, ratingLabel } from '../src/lib/cacheRatings.js'

test('ratings come back keyed by cache, unrated ones with a null average', async () => {
  const calls = []
  const fake = {
    rpc: async (name, args) => {
      calls.push([name, args])
      return {
        data: [
          { cache_id: 'a', average_rating: '4.6', rating_count: 12, find_count: 15 },
          { cache_id: 'b', average_rating: null, rating_count: 0, find_count: 2 },
        ],
        error: null,
      }
    },
  }
  assert.deepEqual(await loadCacheRatings(fake), {
    a: { average: 4.6, count: 12, finds: 15 },
    b: { average: null, count: 0, finds: 2 },
  })
  await loadCacheRatings(fake, ['a'])
  assert.deepEqual(calls, [
    ['cache_ratings', {}],
    ['cache_ratings', { p_cache_ids: ['a'] }],
  ])
})

test('a missing function (not run in Supabase yet) is an error, not empty ratings', async () => {
  const fake = { rpc: async () => ({ data: null, error: { message: 'function not found' } }) }
  await assert.rejects(loadCacheRatings(fake))
})

test('screen readers hear the rating in words', () => {
  assert.equal(ratingLabel({ average: 4.6, count: 12 }), 'Rated 4.6 out of 5 from 12 ratings')
  assert.equal(ratingLabel({ average: 5, count: 1 }), 'Rated 5.0 out of 5 from 1 rating')
  assert.equal(ratingLabel({ average: null, count: 0 }), 'No ratings yet')
})
