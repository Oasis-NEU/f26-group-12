import assert from 'node:assert/strict'
import test from 'node:test'
import { findsLabel, loadLeaderboard, pointsUnit } from '../src/lib/leaderboard.js'

// A tiny stand-in for the Supabase client that records each rpc call.
function fakeClient(result) {
  const calls = []
  return { calls, client: { rpc: async (name, args) => (calls.push([name, args]), result) } }
}

test('it calls the leaderboard function with the limit and maps the rows', async () => {
  const { calls, client } = fakeClient({
    data: [
      { rank: 1, username: 'maya_c', points: 21, finds: 8, is_me: false },
      // Postgres numbers can arrive as strings.
      { rank: '2', username: 'theo.r', points: '14', finds: '6', is_me: true },
    ],
    error: null,
  })
  assert.deepEqual(await loadLeaderboard(client, 50), {
    rows: [
      { rank: 1, username: 'maya_c', points: 21, finds: 8, isMe: false },
      { rank: 2, username: 'theo.r', points: 14, finds: 6, isMe: true },
    ],
    ownRowBelow: null,
  })
  assert.deepEqual(calls, [['leaderboard', { p_limit: 50 }]])
})

test('your own row after the top people comes back separately, with its real rank', async () => {
  const { client } = fakeClient({
    data: [
      { rank: 1, username: 'a', points: 9, finds: 3, is_me: false },
      { rank: 2, username: 'b', points: 5, finds: 2, is_me: false },
      { rank: 7, username: 'me', points: 1, finds: 1, is_me: true },
    ],
    error: null,
  })
  const board = await loadLeaderboard(client, 2)
  assert.deepEqual(
    board.rows.map((row) => row.username),
    ['a', 'b'],
  )
  assert.deepEqual(board.ownRowBelow, { rank: 7, username: 'me', points: 1, finds: 1, isMe: true })
})

test('ties keep the rank the database gave them', async () => {
  const { client } = fakeClient({
    data: [
      { rank: 1, username: 'a', points: 10, finds: 4, is_me: false },
      { rank: 2, username: 'b', points: 8, finds: 3, is_me: false },
      { rank: 2, username: 'c', points: 8, finds: 2, is_me: false },
      { rank: 4, username: 'd', points: 5, finds: 2, is_me: false },
    ],
    error: null,
  })
  const { rows } = await loadLeaderboard(client)
  assert.deepEqual(
    rows.map((row) => row.rank),
    [1, 2, 2, 4],
  )
})

test('nobody on the board yet is an empty list, not an error', async () => {
  const { client } = fakeClient({ data: [], error: null })
  assert.deepEqual(await loadLeaderboard(client), { rows: [], ownRowBelow: null })
})

test('a missing function (not run in Supabase yet) is an error, not an empty board', async () => {
  const { client } = fakeClient({ data: null, error: { message: 'Could not find the function public.leaderboard' } })
  await assert.rejects(loadLeaderboard(client))
})

test('rows only ever carry the totals the page shows', async () => {
  const { client } = fakeClient({
    data: [{ rank: 1, username: 'a', points: 3, finds: 1, is_me: false, id: 'should-not-pass-through' }],
    error: null,
  })
  const { rows } = await loadLeaderboard(client)
  assert.deepEqual(Object.keys(rows[0]).sort(), ['finds', 'isMe', 'points', 'rank', 'username'])
})

test('finds and points read naturally', () => {
  assert.equal(findsLabel(1), '1 find')
  assert.equal(findsLabel(8), '8 finds')
  assert.deepEqual(pointsUnit(1), { short: 'pt', spoken: 'point' })
  assert.deepEqual(pointsUnit(21), { short: 'pts', spoken: 'points' })
})
