import assert from 'node:assert/strict'
import test from 'node:test'
import { isLogFindPath } from '../src/components/layoutRoutes.js'
import {
  checkSecretCode,
  describeLogFindError,
  logFind,
  normalizeSecretCode,
  pointsText,
  saveFindNotes,
} from '../src/lib/logFind.js'

test('codes typed off a slip are tidied and checked before sending', () => {
  assert.equal(normalizeSecretCode(' qdr mx4 '), 'QDRMX4')
  assert.equal(checkSecretCode('   '), 'Enter the code from the slip.')
  assert.equal(checkSecretCode('qdrmx4'), '')
  assert.equal(checkSecretCode('QDRMX'), 'Slip codes have 6 characters. You’ve typed 5.')
  assert.equal(checkSecretCode('QDRM0X'), 'Codes never use 0, O, 1, I or L. Check the slip again.')
  assert.equal(checkSecretCode('QDR-MX'), 'Codes are only letters and numbers. Check the slip again.')
})

test('a request the page gave up on reads as a timeout', () => {
  const abort = Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' })
  assert.equal(describeLogFindError(abort).kind, 'timeout')
})

test('log_find errors become what the page shows', () => {
  const kind = (message) => describeLogFindError({ message }).kind
  assert.equal(kind('That code doesn’t match. Check the slip and try again.'), 'wrong-code')
  assert.equal(kind("That code doesn't match. Check the slip and try again."), 'wrong-code')
  assert.equal(kind("You've already logged this cache!"), 'already-found')
  assert.equal(kind("You hid this cache, so you can't log it as a find."), 'hider')
  assert.equal(kind("This cache isn't active."), 'inactive')
  assert.equal(kind('You need to be logged in to log a find.'), 'signed-out')
  assert.equal(describeLogFindError(new TypeError('Failed to fetch')).kind, 'network')
  assert.equal(kind('something else'), 'other')
  assert.equal(
    describeLogFindError({ message: "That code doesn't match." }).message,
    'That code doesn’t match. Check the slip inside the cache and try again.',
  )
})

test('points earned read naturally', () => {
  assert.equal(pointsText(1), '+1 point')
  assert.equal(pointsText(4), '+4 points')
})

test('logFind sends the tidied code, and leaves out an empty rating or note', async () => {
  const calls = []
  const fake = {
    rpc: async (name, args) => {
      calls.push([name, args])
      return { data: 7, error: null }
    },
  }
  assert.equal(await logFind(fake, { cacheId: 'c1', code: 'qdr mx4', rating: 0, note: '  ' }), 7)
  assert.deepEqual(calls, [
    ['log_find', { p_cache_id: 'c1', p_secret_code: 'QDRMX4', p_rating: null, p_journal_note: null }],
  ])
})

test('the log-a-find route is recognised for the layout', () => {
  assert.equal(isLogFindPath('/caches/abc/log'), true)
  assert.equal(isLogFindPath('/caches/abc'), false)
  assert.equal(isLogFindPath('/caches/abc/log/extra'), false)
})

test('a rating and note are saved onto your own find of this cache', async () => {
  const calls = []
  const query = {
    update(values) {
      calls.push(['update', values])
      return this
    },
    eq(column, value) {
      calls.push(['eq', column, value])
      return this
    },
    then(resolve) {
      return Promise.resolve({ error: null }).then(resolve)
    },
  }
  const fake = {
    from(table) {
      calls.push(['from', table])
      return query
    },
  }
  await saveFindNotes(fake, { cacheId: 'c1', userId: 'u1', rating: 4, note: ' Fun! ' })
  assert.deepEqual(calls, [
    ['from', 'finds'],
    ['update', { rating: 4, journal_note: 'Fun!' }],
    ['eq', 'cache_id', 'c1'],
    ['eq', 'finder_id', 'u1'],
  ])
})
