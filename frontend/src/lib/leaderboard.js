// The leaderboard, from the leaderboard database function
// (supabase/changes/2026-11-27_leaderboard.sql). Each person can only read
// their own finds, so the database adds everyone's points up and returns
// totals only: rank, username, points and number of finds. No user ids and
// never which caches anyone found; is_me marks the logged-in person's row.

// How many people the page lists.
export const LEADERBOARD_LIMIT = 50

// Loads the board. Returns:
//   rows         the top `limit` people, best first: { rank, username,
//                points, finds, isMe }
//   ownRowBelow  your own row when you're logged in, have a find, but aren't
//                in the top `limit` (the page shows it under the list), else
//                null
// Throws if the function fails (for example, it hasn't been run in Supabase
// yet), so the page can say the board couldn't load.
export async function loadLeaderboard(supabase, limit = LEADERBOARD_LIMIT) {
  const { data, error } = await supabase.rpc('leaderboard', { p_limit: limit })
  if (error) throw error
  const people = (data ?? []).map(toPerson)
  // The function sends the top `limit` first, in order, then your own row
  // last if you aren't among them.
  return {
    rows: people.slice(0, limit),
    ownRowBelow: people.slice(limit).find((person) => person.isMe) ?? null,
  }
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

// "1 find", "8 finds".
export function findsLabel(finds) {
  return finds === 1 ? '1 find' : `${finds} finds`
}

// The word after a points number: "pts" on screen ("1 pt"), and the whole
// word for screen readers, which would otherwise spell out "p-t-s".
export function pointsUnit(points) {
  return points === 1 ? { short: 'pt', spoken: 'point' } : { short: 'pts', spoken: 'points' }
}
