import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import DifficultyMeter from '../components/DifficultyMeter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { supabase } from '../lib/supabaseClient.js'
import {
  formatFoundDate,
  loadCacheDetails,
  loadHint,
  loadHintCount,
  loadUserFind,
} from './cacheDetailData.js'

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8102e]'
const PRIMARY_BUTTON = `flex h-12 w-full items-center justify-center bg-black px-5 text-[15px] font-bold leading-[21px] text-white hover:bg-[#292929] ${FOCUS_RING}`

// Who is signed in. undefined = still checking, null = signed out.
function useUserId() {
  const [userId, setUserId] = useState(undefined)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
    })

    supabase.auth
      .getSession()
      .then(({ data }) => setUserId(data.session?.user?.id ?? null))
      .catch(() => setUserId(null))

    return () => subscription.unsubscribe()
  }, [])

  return userId
}

function CachePhoto({ cache }) {
  if (!cache.image) {
    return (
      <div className="flex h-[170px] w-full items-center justify-center bg-[#f5f5f5] text-[13px] font-medium leading-[18px] text-[#444] lg:h-[400px]">
        No photo for this cache
      </div>
    )
  }
  return (
    <img
      src={cache.image}
      alt={`Photo of the area around ${cache.title}`}
      className="h-[170px] w-full object-cover lg:h-[400px]"
    />
  )
}

// One row in the hints list: revealed (white with border), the next one you
// can open (a button), or locked behind the one before it.
function HintRow({ order, text, isNext, pending, onReveal }) {
  if (text !== undefined) {
    return (
      <li className="flex flex-col gap-0.5 border border-black bg-white px-[14px] py-2.5">
        <span className="text-[12px] font-bold leading-[17px] text-[#444]">Hint {order}</span>
        <span className="text-[15px] font-medium leading-[21px] text-black">{text}</span>
      </li>
    )
  }

  const rowClass =
    'flex h-11 w-full items-center justify-between bg-[#f5f5f5] px-[14px] text-left'
  const label = <span className="text-[15px] font-bold leading-[21px] text-black">Hint {order}</span>
  const note = 'text-[13px] font-medium leading-[18px] text-[#444]'

  if (!isNext) {
    return (
      <li className={rowClass}>
        {label}
        <span className={note}>Reveal hint {order - 1} first</span>
      </li>
    )
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => onReveal(order)}
        disabled={pending}
        className={`${rowClass} hover:bg-[#ebebeb] disabled:cursor-wait ${FOCUS_RING}`}
      >
        {label}
        <span className={note}>
          {pending ? (
            'Revealing…'
          ) : (
            <>
              {/* The design says "Tap" on phones and "Click" on desktop. */}
              <span className="lg:hidden">Tap</span>
              <span className="hidden lg:inline">Click</span> to reveal
            </>
          )}
        </span>
      </button>
    </li>
  )
}

function HintsPanel({ hintCount, hintCountError, revealed, pendingOrder, hintError, onReveal }) {
  const revealedCount = Object.keys(revealed).length
  const hintsLeft = hintCount - revealedCount
  // The lowest-numbered hint that hasn't been revealed yet.
  let nextOrder = 1
  while (revealed[nextOrder] !== undefined) nextOrder += 1

  let status = ''
  if (hintCount > 0) {
    status = hintsLeft === 0 ? 'All hints revealed' : hintsLeft === 1 ? '1 hint left' : `${hintsLeft} hints left`
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-bold leading-[25px]">Hints</h2>
        {status && <p className="text-[13px] font-medium leading-[18px] text-[#444]">{status}</p>}
      </div>
      {hintCountError ? (
        <p className="text-[14px] font-medium leading-5 text-[#444]">Hints couldn’t load right now.</p>
      ) : hintCount === 0 ? (
        <p className="text-[14px] font-medium leading-5 text-[#444]">This cache doesn’t have any hints.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {Array.from({ length: hintCount }, (_, index) => index + 1).map((order) => (
            <HintRow
              key={order}
              order={order}
              text={revealed[order]}
              isNext={order === nextOrder}
              pending={pendingOrder === order}
              onReveal={onReveal}
            />
          ))}
        </ol>
      )}
      {hintError && (
        <p role="alert" className="text-[13px] font-bold leading-[18px] text-[#c8102e]">
          {hintError}
        </p>
      )}
    </>
  )
}

// What goes where the "I found it" button is.
function FindAction({ cacheId, find }) {
  if (find) {
    return (
      <p className="flex h-12 items-center justify-center gap-2 border border-black text-[15px] font-bold leading-[21px]">
        <Check aria-hidden="true" size={18} strokeWidth={3} />
        Found by you on {formatFoundDate(find.created_at)}
      </p>
    )
  }
  return (
    <Link to={`/caches/${cacheId}/log`} className={PRIMARY_BUTTON}>
      I found it
    </Link>
  )
}

function Notice({ children, role = 'status' }) {
  return (
    <div role={role} className="border border-black bg-white p-4 text-[14px] font-medium leading-5 text-[#444]">
      {children}
    </div>
  )
}

function CacheDetailPage() {
  const { cacheId } = useParams()
  const userId = useUserId()
  const [retryCount, setRetryCount] = useState(0)
  // Each piece of loaded data is tagged with what it belongs to, so stale
  // results from a previous cache (or user) are ignored instead of shown.
  const [details, setDetails] = useState({ key: null, cache: null, hintCount: 0, hintCountError: false, error: false })
  const [findResult, setFindResult] = useState({ key: null, find: null })
  const [hints, setHints] = useState({ cacheId: null, revealed: {}, pendingOrder: null, error: '' })

  const detailsKey = `${cacheId}:${retryCount}`
  const loading = details.key !== detailsKey
  const { cache } = details
  const findKey = `${cacheId}:${userId}`
  const find = findResult.key === findKey ? findResult.find : null
  const revealed = hints.cacheId === cacheId ? hints.revealed : {}

  // Load the cache and how many hints it has.
  useEffect(() => {
    let active = true
    const key = `${cacheId}:${retryCount}`

    Promise.all([
      loadCacheDetails(supabase, cacheId),
      // A failed count shouldn't hide the whole cache, so catch it separately.
      loadHintCount(supabase, cacheId).then(
        (count) => ({ count, failed: false }),
        () => ({ count: 0, failed: true }),
      ),
    ])
      .then(([loadedCache, { count, failed }]) => {
        if (active) setDetails({ key, cache: loadedCache, hintCount: count, hintCountError: failed, error: false })
      })
      .catch(() => {
        if (active) setDetails({ key, cache: null, hintCount: 0, hintCountError: false, error: true })
      })

    return () => {
      active = false
    }
  }, [cacheId, retryCount])

  // Has the signed-in user already found this cache?
  useEffect(() => {
    if (userId === undefined) return
    let active = true

    loadUserFind(supabase, cacheId, userId)
      .then((loadedFind) => {
        if (active) setFindResult({ key: `${cacheId}:${userId}`, find: loadedFind })
      })
      // If this fails we just show the normal "I found it" button.
      .catch(() => {})

    return () => {
      active = false
    }
  }, [cacheId, userId])

  // Reveal hint 1 to start. If they've already found it, reveal every hint.
  const hintCount = loading ? 0 : details.hintCount
  const revealAll = Boolean(find)
  useEffect(() => {
    if (hintCount === 0) return
    let active = true
    const orders = revealAll ? Array.from({ length: hintCount }, (_, index) => index + 1) : [1]

    Promise.all(orders.map((order) => loadHint(supabase, cacheId, order)))
      .then((loaded) => {
        if (!active) return
        setHints((current) => {
          const base = current.cacheId === cacheId ? current.revealed : {}
          const next = { ...base }
          loaded.forEach((hint) => {
            if (hint) next[hint.hint_order] = hint.hint_text
          })
          return { cacheId, revealed: next, pendingOrder: null, error: '' }
        })
      })
      .catch(() => {
        if (active) setHints({ cacheId, revealed: {}, pendingOrder: null, error: 'Hints couldn’t load right now.' })
      })

    return () => {
      active = false
    }
  }, [cacheId, hintCount, revealAll])

  // Revealing only fetches that one hint, so later hints never reach the
  // browser until someone asks. Nothing is saved; a refresh starts over.
  async function revealHint(order) {
    setHints((current) => ({ ...current, cacheId, pendingOrder: order, error: '' }))
    try {
      const hint = await loadHint(supabase, cacheId, order)
      setHints((current) => ({
        cacheId,
        revealed: hint ? { ...current.revealed, [order]: hint.hint_text } : current.revealed,
        pendingOrder: null,
        error: hint ? '' : 'That hint isn’t available.',
      }))
    } catch {
      setHints((current) => ({ ...current, pendingOrder: null, error: 'That hint couldn’t load. Try again.' }))
    }
  }

  let body
  if (loading) {
    body = <Notice>Loading cache…</Notice>
  } else if (details.error) {
    body = (
      <Notice role="alert">
        We couldn’t load this cache.{' '}
        <button type="button" onClick={() => setRetryCount((count) => count + 1)} className="font-bold text-black underline">
          Try again
        </button>
      </Notice>
    )
  } else if (!cache) {
    body = <Notice>We couldn’t find that cache. It may have been removed, or the link is wrong.</Notice>
  } else {
    body = (
      <div className="flex flex-col gap-[14px] lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-12">
        <div className="flex flex-col gap-[14px] lg:gap-5">
          <CachePhoto cache={cache} />
          <h1 className="text-[24px] font-extrabold leading-[34px] lg:text-[36px] lg:leading-[44px]">
            {cache.title}
          </h1>
          <div className="flex items-center justify-between gap-4 lg:justify-start lg:gap-6">
            {cache.location_name && (
              <p className="text-[14px] font-medium leading-5 text-[#444] lg:text-[15px] lg:leading-[21px]">
                {cache.location_name}
              </p>
            )}
            <DifficultyMeter difficulty={cache.difficulty} />
          </div>
          {cache.description && (
            <p className="whitespace-pre-line text-[15px] font-medium leading-[21px] lg:max-w-[640px] lg:text-[17px] lg:leading-6">
              {cache.description}
            </p>
          )}
        </div>

        {/* Phones: this flows under the description. Desktop: a card on the right that stays in view. */}
        <aside className="flex flex-col gap-[14px] lg:sticky lg:top-6 lg:gap-4 lg:border lg:border-black lg:bg-white lg:p-6">
          {cache.is_active ? (
            <>
              <HintsPanel
                hintCount={details.hintCount}
                hintCountError={details.hintCountError}
                revealed={revealed}
                pendingOrder={hints.cacheId === cacheId ? hints.pendingOrder : null}
                hintError={hints.cacheId === cacheId ? hints.error : ''}
                onReveal={revealHint}
              />
              <div className="hidden flex-col gap-4 lg:flex">
                <div className="h-px w-full bg-[#f5f5f5]" />
                <FindAction cacheId={cacheId} find={find} />
              </div>
            </>
          ) : (
            <p className="border border-black bg-[#f5f5f5] p-4 text-[15px] font-medium leading-[21px]">
              This cache has been taken down, so it can’t be logged anymore.
            </p>
          )}
        </aside>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white text-black">
      <SiteHeader />

      <div className="flex w-full flex-1 flex-col gap-[14px] p-4 md:px-8 lg:gap-6 lg:px-[10%] lg:py-8">
        <Link to="/" className={`w-fit text-[14px] font-bold leading-5 text-[#444] hover:text-black ${FOCUS_RING}`}>
          ← Back to map
        </Link>
        {body}
      </div>

      {/* Phones: the action is pinned to the bottom of the screen. */}
      {!loading && cache?.is_active && (
        <div className="sticky bottom-0 border-t border-black bg-white p-4 lg:hidden">
          <FindAction cacheId={cacheId} find={find} />
        </div>
      )}
    </div>
  )
}

export default CacheDetailPage
