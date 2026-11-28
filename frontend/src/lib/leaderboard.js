// The leaderboard, from the leaderboard database function
// (supabase/changes/2026-11-27_leaderboard.sql). Each person can only read
// their own finds, so the database adds everyone's points up and returns
// totals only: rank, username, points and number of finds. No user ids and
// never which caches anyone found; is_me marks the logged-in person's row,
// and in_top says whether a row is in the list or is your own row from
// further down.

// How many people the page lists.
export const LEADERBOARD_LIMIT = 50

// How long to wait for the board before giving up and offering Try again.
export const LEADERBOARD_TIMEOUT_MS = 15000

// Loads the board. Returns:
//   rows         the top people, best first: { rank, username, points,
//                finds, isMe }
//   ownRowBelow  your own row when you're logged in, have a find, but aren't
//                in the top (the page shows it under the list), else null
// Throws if the function fails (for example, it hasn't been run in Supabase
// yet) or gives no answer within timeoutMs, so the page can say the board
// couldn't load.
export async function loadLeaderboard(supabase, limit = LEADERBOARD_LIMIT, timeoutMs = LEADERBOARD_TIMEOUT_MS) {
  const { data, error } = await withTimeout(supabase.rpc('leaderboard', { p_limit: limit }), timeoutMs)
  if (error) throw error
  const rows = []
  let ownRowBelow = null
  // in_top says which list each row belongs to: the top, or (only ever your
  // own row) under it.
  for (const row of data ?? []) {
    if (row.in_top === false) {
      if (row.is_me === true) ownRowBelow = toPerson(row)
    } else {
      rows.push(toPerson(row))
    }
  }
  return { rows, ownRowBelow }
}

// Rejects with Error('timeout') if the promise takes longer than ms (the
// same helper as useCacheDetail's), so a dead connection ends in the error
// state instead of "Loading…" forever.
function withTimeout(promise, ms) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

// Numbers can arrive as strings from Postgres, so they're turned into numbers.
function toPerson(row) {
  return {
    rank: Number(row.rank) || 0,
    username: row.username ?? '',
    points: Number(row.points) || 0,
    finds: Number(row.finds) || 0,
    isMe: row.is_me === true,
  }
}

// The line at the top for someone on the board: "You're #23 with 9 points."
export function yourRankLine(person) {
  const points = person.points === 1 ? '1 point' : `${person.points} points`
  return `You’re #${person.rank} with ${points}.`
}

// "1 find", "8 finds".
export function findsLabel(finds) {
  return finds === 1 ? '1 find' : `${finds} finds`
}

// The word after a points number: "pts" on screen ("1 pt"), and the whole
// word for screen readers, which would otherwise spell out "p-t-s".
export function pointsUnit(points) {
  return points === 1 ? { short: 'pt', spoken: 'point' } : { short: 'pts', spoken: 'points' }
}
