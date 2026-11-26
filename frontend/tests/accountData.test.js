import assert from 'node:assert/strict'
import test from 'node:test'
import { formatPoints, getInitials, loadAccountSummary } from '../src/components/accountData.js'

// Fake Supabase client: each table name maps to the result its query returns.
function createSupabaseStub(resultsByTable) {
  const calls = []
  return {
    calls,
    client: {
      from(table) {
        calls.push(['from', table])
        const query = {
          select: (columns) => (calls.push(['select', table, columns]), query),
          eq: (column, value) => (calls.push(['eq', table, column, value]), query),
          maybeSingle: () => query,
          then: (resolve, reject) => Promise.resolve(resultsByTable[table]).then(resolve, reject),
        }
        return query
      },
    },
  }
}

test('loadAccountSummary returns the username and points from found cache difficulty', async () => {
  const { calls, client } = createSupabaseStub({
    profiles: { data: { username: 'the_real_husky_hunter' }, error: null },
    finds: {
      data: [{ caches: { difficulty: 3 } }, { caches: { difficulty: 1 } }, { caches: null }],
      error: null,
    },
  })

  const summary = await loadAccountSummary(client, 'user-1')

  assert.deepEqual(summary, { username: 'the_real_husky_hunter', points: 4 })
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'finds' && call[2] === 'finder_id'))
})

test('loadAccountSummary throws Supabase errors', async () => {
  const { client } = createSupabaseStub({
    profiles: { data: null, error: new Error('nope') },
    finds: { data: [], error: null },
  })

  await assert.rejects(loadAccountSummary(client, 'user-1'), /nope/)
})

test('getInitials uses the first two letters of the username', () => {
  assert.equal(getInitials('the_real_husky_hunter_class_of_2029'), 'TH')
  assert.equal(getInitials('maya.chen'), 'MA')
  assert.equal(getInitials('_x_ninja'), 'XN')
  assert.equal(getInitials(''), '?')
})

test('formatPoints handles singular and plural', () => {
  assert.equal(formatPoints(1), '1 point')
  assert.equal(formatPoints(4), '4 points')
  assert.equal(formatPoints(0), '0 points')
})
