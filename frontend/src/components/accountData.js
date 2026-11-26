// Data helpers for the account menu in SiteHeader.

// Loads what the menu shows about the logged-in person: their username and
// points. Points = the sum of `difficulty` for every cache they've found
// (see PROJECT_CONTEXT.md). It's calculated here, not stored.
export async function loadAccountSummary(supabase, userId) {
  const [profileResult, findsResult] = await Promise.all([
    supabase.from('profiles').select('username').eq('id', userId).maybeSingle(),
    // "caches(difficulty)" pulls in the found cache's difficulty through the
    // finds.cache_id foreign key.
    supabase.from('finds').select('caches(difficulty)').eq('finder_id', userId),
  ])

  if (profileResult.error) throw profileResult.error
  if (findsResult.error) throw findsResult.error

  const points = (findsResult.data ?? []).reduce(
    (total, find) => total + (Number(find.caches?.difficulty) || 0),
    0,
  )

  return { username: profileResult.data?.username ?? '', points }
}

// The avatar shows the first two letters of the username, as in the design:
// "the_real_husky_hunter" -> "TH", "maya.chen" -> "MA".
// Leading symbols are skipped so "_x_ninja" still gets letters.
export function getInitials(username) {
  const letters = (username ?? '').replace(/[^a-zA-Z0-9]/g, '')
  return letters ? letters.slice(0, 2).toUpperCase() : '?'
}

export function formatPoints(points) {
  return points === 1 ? '1 point' : `${points} points`
}
