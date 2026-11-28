import assert from 'node:assert/strict'
import test from 'node:test'
import {
  bringBackCache,
  describeSaveError,
  formSnapshot,
  loadCacheForEdit,
  NothingSavedError,
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
    for (const method of ['select', 'eq', 'gt', 'order', 'update', 'upsert', 'insert', 'delete', 'maybeSingle', 'abortSignal']) {
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

// Splits the recorded calls into one list per request (each starts with
// from(table)), so a test can check them in order.
function requests(calls) {
  const list = []
  for (const call of calls) {
    if (call[0] === 'from') list.push([call])
    else list.at(-1).push(call)
  }
  return list
}

function has(request, method, ...args) {
  return request.some((call) => call[0] === method && args.every((arg, i) => Object.is(call[i + 1], arg)))
}

// What a working update sends back: the changed row (asked for with .select).
const CHANGED = { data: [{ id: 'c1' }], error: null }
const NONE_CHANGED = { data: [], error: null }

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

test('saveCacheEdits changes existing hints, never upserts, and removes hints past the new last one', async () => {
  const { calls, client } = createSupabaseStub([
    CHANGED, // caches update
    { data: [{ hint_order: 1 }, { hint_order: 2 }, { hint_order: 3 }], error: null }, // existing hints
    { data: [{ hint_order: 1 }], error: null }, // hint 1 text
    { data: [{ hint_order: 2 }], error: null }, // hint 2 text
    NONE_CHANGED, // delete past 2
  ])

  await saveCacheEdits(client, 'c1', { title: 'x' }, ['A', 'B'])

  const [cacheUpdate, read, hint1, hint2, remove] = requests(calls)
  assert.deepEqual(cacheUpdate[0], ['from', 'caches'])
  assert.ok(has(cacheUpdate, 'eq', 'id', 'c1'))
  assert.ok(has(cacheUpdate, 'select', 'id'), 'asks for the changed row back')

  assert.deepEqual(read[0], ['from', 'hints'])
  assert.ok(has(read, 'select', 'hint_order'))

  // Only hint_text is updated: the database has no UPDATE grant on cache_id.
  for (const [request, order, text] of [
    [hint1, 1, 'A'],
    [hint2, 2, 'B'],
  ]) {
    assert.deepEqual(request.find((call) => call[0] === 'update')[1], { hint_text: text })
    assert.ok(has(request, 'eq', 'cache_id', 'c1'))
    assert.ok(has(request, 'eq', 'hint_order', order))
  }

  assert.ok(has(remove, 'delete'))
  assert.ok(has(remove, 'gt', 'hint_order', 2))
  assert.ok(!calls.some((call) => call[0] === 'upsert'))
  assert.ok(!calls.some((call) => call[0] === 'insert'), 'nothing new to add')
})

test('saveCacheEdits adds hints that are new, after changing the ones already there', async () => {
  const { calls, client } = createSupabaseStub([
    CHANGED,
    { data: [{ hint_order: 1 }], error: null },
    { data: [{ hint_order: 1 }], error: null },
    { data: null, error: null }, // insert
    NONE_CHANGED,
  ])

  await saveCacheEdits(client, 'c1', { title: 'x' }, ['A', 'B', 'C'])

  const insert = calls.find((call) => call[0] === 'insert')
  assert.deepEqual(insert[1], [
    { cache_id: 'c1', hint_order: 2, hint_text: 'B' },
    { cache_id: 'c1', hint_order: 3, hint_text: 'C' },
  ])
  assert.equal(calls.filter((call) => call[0] === 'update').length, 2, 'the cache row and hint 1')
  assert.ok(calls.some((call) => call[0] === 'gt' && call[2] === 3))
})

test('saveCacheEdits with no hints only removes them, and removing none is still a success', async () => {
  const { calls, client } = createSupabaseStub([CHANGED, { data: [], error: null }, NONE_CHANGED])

  await saveCacheEdits(client, 'c1', { title: 'x' }, [])

  assert.ok(!calls.some((call) => call[0] === 'insert' || call[0] === 'upsert'))
  assert.equal(calls.filter((call) => call[0] === 'update').length, 1, 'just the cache row')
  assert.ok(calls.some((call) => call[0] === 'gt' && call[2] === 0))
})

test('saveCacheEdits stops and throws if the cache update fails', async () => {
  const { calls, client } = createSupabaseStub([{ data: null, error: new Error('denied') }])

  await assert.rejects(saveCacheEdits(client, 'c1', { title: 'x' }, ['A']), /denied/)
  assert.ok(!calls.some((call) => call[0] === 'from' && call[1] === 'hints'))
})

test('saveCacheEdits treats a cache update that changed no rows as a failure, before touching hints', async () => {
  // RLS blocks an update by changing nothing, with no error.
  const { calls, client } = createSupabaseStub([NONE_CHANGED])

  await assert.rejects(saveCacheEdits(client, 'c1', { title: 'x' }, ['A']), NothingSavedError)
  assert.ok(!calls.some((call) => call[0] === 'from' && call[1] === 'hints'))
})

test('saveCacheEdits throws when a hint text update changes no rows', async () => {
  const { client } = createSupabaseStub([CHANGED, { data: [{ hint_order: 1 }], error: null }, NONE_CHANGED])

  await assert.rejects(saveCacheEdits(client, 'c1', { title: 'x' }, ['A']), NothingSavedError)
})

test('saveCacheEdits passes the time limit signal to every request', async () => {
  const { calls, client } = createSupabaseStub([
    CHANGED,
    { data: [{ hint_order: 1 }], error: null },
    { data: [{ hint_order: 1 }], error: null },
    { data: null, error: null },
    NONE_CHANGED,
  ])
  const signal = new AbortController().signal

  await saveCacheEdits(client, 'c1', { title: 'x' }, ['A', 'B'], signal)

  for (const request of requests(calls)) {
    assert.ok(has(request, 'abortSignal', signal), `${request[0][1]} request has the signal`)
  }
})

test('describeSaveError tells expired logins, time-outs and blocked saves apart', () => {
  assert.equal(describeSaveError({ code: 'PGRST301', message: 'JWT expired' }).kind, 'signed-out')
  assert.equal(describeSaveError({ status: 401 }).kind, 'signed-out')
  const timeout = describeSaveError(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' }))
  assert.equal(timeout.kind, 'timeout')
  assert.match(timeout.message, /signal/)
  assert.equal(describeSaveError(new NothingSavedError()).kind, 'not-saved')
  assert.equal(describeSaveError(new Error('boom')).kind, 'other')
})

test('formSnapshot ignores extra spaces and blank hint boxes, but notices real changes', () => {
  const loaded = { ...validForm, hints: ['Follow the path along the water.'] }

  assert.equal(formSnapshot(loaded), formSnapshot({ ...loaded, title: 'fens fox', hints: [...loaded.hints, ' '] }))
  assert.notEqual(formSnapshot(loaded), formSnapshot({ ...loaded, title: 'fens fox 2' }))
  assert.notEqual(formSnapshot(loaded), formSnapshot({ ...loaded, position: { lat: 42.35, lng: -71.09 } }))
  assert.notEqual(formSnapshot(loaded), formSnapshot({ ...loaded, hints: ['Look low.'] }))
})

test('takeDownCache sets is_active to false instead of deleting, and checks a row changed', async () => {
  const { calls, client } = createSupabaseStub([CHANGED])

  await takeDownCache(client, 'c1')

  assert.ok(calls.some((call) => call[0] === 'update' && call[1].is_active === false))
  assert.ok(calls.some((call) => call[0] === 'select' && call[1] === 'id'))
  assert.ok(!calls.some((call) => call[0] === 'delete'))
})

test('takeDownCache fails when no row changed (RLS blocked it without an error)', async () => {
  const { client } = createSupabaseStub([NONE_CHANGED])

  await assert.rejects(takeDownCache(client, 'c1'), NothingSavedError)
})

test('bringBackCache sets is_active back to true on that cache only', async () => {
  const { calls, client } = createSupabaseStub([CHANGED])

  await bringBackCache(client, 'c1')

  assert.deepEqual(calls[0], ['from', 'caches'])
  const update = calls.find((call) => call[0] === 'update')
  assert.deepEqual(update[1], { is_active: true })
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'id' && call[2] === 'c1'))
  assert.ok(calls.some((call) => call[0] === 'select' && call[1] === 'id'))
  assert.ok(!calls.some((call) => call[0] === 'delete'))
})

test('bringBackCache throws if the update fails', async () => {
  const { client } = createSupabaseStub([{ data: null, error: new Error('denied') }])

  await assert.rejects(bringBackCache(client, 'c1'), /denied/)
})

test('bringBackCache fails when no row changed', async () => {
  const { client } = createSupabaseStub([NONE_CHANGED])

  await assert.rejects(bringBackCache(client, 'c1'), NothingSavedError)
})
