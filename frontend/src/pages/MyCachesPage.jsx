import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import SiteHeader from '../components/SiteHeader.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { describeCacheStats, loadMyCaches } from './myCachesData.js'

// Outlined black button used for every action on this page.
const SECONDARY_BUTTON =
  'flex h-10 items-center justify-center border border-black bg-white px-4 text-[14px] font-bold leading-5 text-black whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8102e]'

function StatusBadge({ active }) {
  return active ? (
    <span className="shrink-0 border border-black bg-white px-2.5 py-0.5 text-[12px] font-bold leading-[17px] text-black">
      Active
    </span>
  ) : (
    <span className="shrink-0 bg-[#f5f5f5] px-2.5 py-0.5 text-[12px] font-bold leading-[17px] text-[#444]">
      Taken down
    </span>
  )
}

// One cache. Phone: info on top, buttons share a full-width row below.
// Desktop (md+): info on the left, buttons on the right.
function MyCacheCard({ cache }) {
  return (
    <li className="flex flex-col gap-3 border border-black bg-white p-4 md:flex-row md:items-center md:gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <h2
            className={`min-w-0 flex-1 text-[16px] font-bold leading-[22px] ${
              cache.is_active ? 'text-black' : 'text-[#444]'
            }`}
          >
            {cache.title}
          </h2>
          <StatusBadge active={cache.is_active} />
        </div>
        <p className="text-[13px] font-medium leading-[18px] text-[#444]">
          {describeCacheStats(cache)}
        </p>
      </div>

      <div className="flex gap-2">
        <Link
          to={`/caches/${cache.id}/edit`}
          className={`${SECONDARY_BUTTON} flex-1 hover:bg-[#f5f5f5] md:flex-none`}
        >
          Edit
        </Link>
        {/* Taken-down caches have no slip to print. */}
        {cache.is_active && (
          // The printable slip page isn't built yet, so this stays disabled for now.
          <button
            type="button"
            disabled
            title="Printing slips is coming soon"
            className={`${SECONDARY_BUTTON} flex-1 cursor-not-allowed md:flex-none`}
          >
            Print slip
          </button>
        )}
      </div>
    </li>
  )
}

// A plain message box used for loading, signed-out, empty and error states.
function Notice({ children, role = 'status' }) {
  return (
    <div role={role} className="border border-black bg-white p-4 text-[14px] font-medium leading-5 text-[#444] md:text-[16px] md:leading-[22px]">
      {children}
    </div>
  )
}

function MyCachesPage() {
  // undefined = still checking who is signed in; null = signed out.
  const [userId, setUserId] = useState(undefined)
  // The last finished load, tagged with whose caches it holds. If that isn't
  // the current user yet, we're still loading.
  const [result, setResult] = useState({ userId: undefined, caches: [], error: '' })
  const loading = result.userId !== userId
  const { caches, error } = result

  // Find out who is signed in, and keep listening in case that changes.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
    })

    supabase.auth
      .getSession()
      .then(({ data }) => setUserId(data.session?.user?.id ?? null))
      // If the session check fails, treat them as signed out instead of loading forever.
      .catch(() => setUserId(null))

    return () => subscription.unsubscribe()
  }, [])

  // Load this user's caches whenever the signed-in user changes.
  useEffect(() => {
    if (userId === undefined) {
      return
    }

    // "active" stops a slow, out-of-date request from overwriting newer data.
    let active = true

    loadMyCaches(supabase, userId)
      .then((caches) => {
        if (active) setResult({ userId, caches, error: '' })
      })
      .catch(() => {
        if (active) {
          setResult({
            userId,
            caches: [],
            error: 'We couldn’t load your caches. Refresh the page to try again.',
          })
        }
      })

    return () => {
      active = false
    }
  }, [userId])

  let content
  if (userId === undefined || loading) {
    content = <Notice>Loading your caches…</Notice>
  } else if (userId === null) {
    content = (
      <Notice>
        <Link to="/login" className="font-bold text-black underline">
          Log in
        </Link>{' '}
        to see the caches you’ve hidden.
      </Notice>
    )
  } else if (error) {
    content = <Notice role="alert">{error}</Notice>
  } else if (caches.length === 0) {
    content = <Notice>You haven’t hidden any caches yet.</Notice>
  } else {
    content = (
      <ul className="flex flex-col gap-4">
        {caches.map((cache) => (
          <MyCacheCard key={cache.id} cache={cache} />
        ))}
      </ul>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white text-black">
      <SiteHeader />

      <div className="flex w-full flex-col gap-4 p-4 md:mx-auto md:max-w-[800px] md:pb-12 md:pt-10">
        <div className="flex items-center justify-between gap-4">
          <h1 className="whitespace-nowrap text-[24px] font-extrabold leading-8 tracking-[-0.25px] md:text-[36px] md:leading-[44px] md:tracking-normal">
            My caches
          </h1>
          <Link to="/caches/new" className={`${SECONDARY_BUTTON} hover:bg-[#f5f5f5]`}>
            Hide a new cache
          </Link>
        </div>

        <p className="text-[14px] font-medium leading-5 text-[#444] md:text-[16px] md:leading-[22px]">
          Caches you’ve hidden. Edit them, print a new slip, or take them down.
        </p>

        {content}
      </div>
    </div>
  )
}

export default MyCachesPage
