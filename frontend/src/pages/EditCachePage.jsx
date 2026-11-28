import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import LocationPicker from '../components/LocationPicker.jsx'
import { useLoginDialog } from '../components/login/loginDialogContext.js'
import SiteHeader from '../components/SiteHeader.jsx'
import { supabase } from '../lib/supabaseClient.js'
import {
  MAX_HINTS,
  loadCacheForEdit,
  prepareCacheEdits,
  saveCacheEdits,
  takeDownCache,
} from './editCacheData.js'

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8102e]'
const INPUT =
  'w-full border border-black bg-white px-4 text-[16px] font-medium leading-[22px] text-black placeholder:text-[#767676] focus:outline focus:outline-2 focus:outline-offset-0 focus:outline-[#c8102e]'
const PRIMARY_BUTTON = `flex h-12 items-center justify-center bg-black px-5 text-[15px] font-bold leading-[21px] text-white hover:bg-[#292929] disabled:cursor-wait disabled:bg-[#444] ${FOCUS_RING}`
const SECONDARY_BUTTON = `flex items-center justify-center border border-black bg-white text-[15px] font-bold leading-[21px] text-black hover:bg-[#f5f5f5] disabled:cursor-wait ${FOCUS_RING}`
const SECTION_TITLE = 'text-[18px] font-bold leading-[25px]'
const LABEL = 'text-[14px] font-bold leading-5'
const HELP = 'text-[13px] font-medium leading-[18px] text-[#444]'
const ERROR = 'text-[13px] font-bold leading-[18px] text-[#c8102e]'

// Label + input stacked with 8px between, as in the design.
function Field({ label, htmlFor, error, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className={LABEL}>
        {label}
      </label>
      {children}
      {error && <p className={ERROR}>{error}</p>}
    </div>
  )
}

function DifficultyPicker({ value, onChange, error }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={`${LABEL} mb-2`}>Difficulty</legend>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((level) => {
          const selected = value === level
          return (
            <button
              key={level}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(level)}
              className={`flex h-11 min-w-0 flex-1 items-center justify-center text-[16px] font-bold leading-[22px] ${FOCUS_RING} ${
                selected ? 'bg-black text-white' : 'border border-black bg-white text-black hover:bg-[#f5f5f5]'
              }`}
            >
              {level}
            </button>
          )
        })}
      </div>
      <p className={HELP}>1 = easy to spot, 5 = a real challenge</p>
      {error && <p className={ERROR}>{error}</p>}
    </fieldset>
  )
}

// The form itself. It only mounts once the cache has loaded, so its starting
// values can come straight from `cache` and `initialHints`.
function EditCacheForm({ cache, initialHints }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: cache.title ?? '',
    description: cache.description ?? '',
    locationName: cache.location_name ?? '',
    difficulty: cache.difficulty,
    position: { lat: cache.latitude, lng: cache.longitude },
    // Always show at least one hint box.
    hints: initialHints.length > 0 ? initialHints : [''],
  })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | saving | taking-down
  const [submitError, setSubmitError] = useState('')
  const busy = status !== 'idle'

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function updateHint(index, value) {
    setForm((current) => ({
      ...current,
      hints: current.hints.map((hint, i) => (i === index ? value : hint)),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault() // stop the browser's default full-page form submit
    const { values, hints, errors: newErrors } = prepareCacheEdits(form)
    if (newErrors) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    setSubmitError('')
    setStatus('saving')
    try {
      await saveCacheEdits(supabase, cache.id, values, hints)
      navigate('/my-caches')
    } catch {
      setSubmitError('We couldn’t save your changes. Check your connection and try again.')
      setStatus('idle')
    }
  }

  async function handleTakeDown() {
    const confirmed = window.confirm(
      `Take down “${cache.title}”? It will disappear from the map for everyone.`,
    )
    if (!confirmed) return

    setSubmitError('')
    setStatus('taking-down')
    try {
      await takeDownCache(supabase, cache.id)
      navigate('/my-caches')
    } catch {
      setSubmitError('We couldn’t take this cache down. Try again in a moment.')
      setStatus('idle')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-7 lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start lg:gap-12"
    >
      {/* Where: first on phones, right-hand column on desktop. */}
      <section aria-labelledby="where-title" className="flex flex-col gap-3 lg:col-start-2 lg:row-start-1">
        <h2 id="where-title" className={SECTION_TITLE}>
          Where is it?
        </h2>
        <LocationPicker
          position={form.position}
          onChange={(position) => update('position', position)}
          className="h-[180px] lg:h-[360px]"
        />
        {errors.position && <p className={ERROR}>{errors.position}</p>}
        <Field label="Location name (optional)" htmlFor="location-name">
          <input
            id="location-name"
            className={`${INPUT} h-12`}
            value={form.locationName}
            onChange={(event) => update('locationName', event.target.value)}
            placeholder="e.g. Back Bay Fens"
          />
        </Field>
      </section>

      <div className="flex flex-col gap-7 lg:col-start-1 lg:row-start-1 lg:gap-8">
        <section aria-labelledby="what-title" className="flex flex-col gap-4">
          <h2 id="what-title" className={SECTION_TITLE}>
            What is it?
          </h2>
          <Field label="Cache name" htmlFor="cache-name" error={errors.title}>
            <input
              id="cache-name"
              className={`${INPUT} h-12`}
              value={form.title}
              onChange={(event) => update('title', event.target.value)}
              aria-invalid={Boolean(errors.title)}
              required
            />
          </Field>
          <Field label="Description (optional)" htmlFor="description">
            <textarea
              id="description"
              className={`${INPUT} h-24 resize-y py-3`}
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
            />
          </Field>
          <DifficultyPicker
            value={form.difficulty}
            onChange={(level) => update('difficulty', level)}
            error={errors.difficulty}
          />
          <div className="flex flex-col gap-2">
            <p className={LABEL}>Photo (optional)</p>
            {cache.image && (
              <img src={cache.image} alt="Current cache photo" className="max-h-48 w-fit border border-black object-cover" />
            )}
            {/* Photo uploads need Supabase Storage, which isn't set up yet. */}
            <button
              type="button"
              disabled
              title="Photo uploads are coming soon"
              className="flex h-16 w-full cursor-not-allowed items-center justify-center border border-dashed border-black bg-white text-[13px] font-medium leading-[18px] text-[#444]"
            >
              + Add a photo
            </button>
          </div>
        </section>

        <section aria-labelledby="hints-title" className="flex flex-col gap-3">
          <h2 id="hints-title" className={SECTION_TITLE}>
            Hints (optional, up to {MAX_HINTS})
          </h2>
          <p className={HELP}>Start vague. Each hint should give away a little more.</p>
          {form.hints.map((hint, index) => (
            <Field key={index} label={`Hint ${index + 1}`} htmlFor={`hint-${index}`}>
              <input
                id={`hint-${index}`}
                className={`${INPUT} h-12`}
                value={hint}
                onChange={(event) => updateHint(index, event.target.value)}
              />
            </Field>
          ))}
          {form.hints.length < MAX_HINTS && (
            <button
              type="button"
              onClick={() => update('hints', [...form.hints, ''])}
              className={`w-fit text-[14px] font-bold leading-5 hover:underline ${FOCUS_RING}`}
            >
              + Add another hint
            </button>
          )}
        </section>

        <section aria-labelledby="code-title" className="flex flex-col gap-3">
          <h2 id="code-title" className={SECTION_TITLE}>
            Secret code
          </h2>
          <div className="flex flex-col gap-2">
            <p className={LABEL}>Your cache’s code</p>
            <p className="flex h-14 items-center border border-black bg-[#f5f5f5] px-4 text-[20px] font-extrabold leading-7">
              {cache.secret_code}
            </p>
            <p className={HELP}>
              The code can’t be changed, because it’s already on the slip inside the container.
            </p>
          </div>
        </section>

        {submitError && (
          <p role="alert" className={ERROR}>
            {submitError}
          </p>
        )}

        {/* Desktop buttons. Phones use the bar fixed to the bottom instead. */}
        <div className="hidden gap-3 lg:flex">
          <button type="submit" disabled={busy} className={PRIMARY_BUTTON}>
            {status === 'saving' ? 'Saving…' : 'Save changes'}
          </button>
          <Link to="/my-caches" className={`${SECONDARY_BUTTON} h-12 px-5`}>
            Cancel
          </Link>
        </div>

        <section aria-labelledby="take-down-title" className="flex flex-col gap-2 border-t border-black pt-5">
          <h2 id="take-down-title" className="text-[16px] font-bold leading-[22px]">
            Take down this cache
          </h2>
          {cache.is_active ? (
            <>
              <p className={HELP}>
                It disappears from the map, but stays in the journals of everyone who found it.
              </p>
              <button
                type="button"
                onClick={handleTakeDown}
                disabled={busy}
                className={`${SECONDARY_BUTTON} h-11 w-full px-4 lg:w-fit`}
              >
                {status === 'taking-down' ? 'Taking down…' : 'Take down cache'}
              </button>
            </>
          ) : (
            <p className={HELP}>This cache is already taken down, so it isn’t on the map.</p>
          )}
        </section>
      </div>

      <div className="sticky bottom-0 -mx-4 -mb-4 border-t border-black bg-white p-4 md:-mx-8 lg:hidden">
        <button type="submit" disabled={busy} className={`${PRIMARY_BUTTON} w-full`}>
          {status === 'saving' ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

function Notice({ children, role = 'status' }) {
  return (
    <div role={role} className="border border-black bg-white p-4 text-[14px] font-medium leading-5 text-[#444]">
      {children}
    </div>
  )
}

function EditCachePage() {
  const { openLogin } = useLoginDialog()
  const { cacheId } = useParams()
  // undefined = still checking who is signed in; null = signed out.
  const [userId, setUserId] = useState(undefined)
  // The last finished load, tagged with which cache it's for.
  const [result, setResult] = useState({ cacheId: null, data: null, error: '' })
  const loading = result.cacheId !== cacheId

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

  useEffect(() => {
    let active = true

    loadCacheForEdit(supabase, cacheId)
      .then((data) => {
        if (active) setResult({ cacheId, data, error: '' })
      })
      .catch(() => {
        if (active) {
          setResult({ cacheId, data: null, error: 'We couldn’t load this cache. Refresh the page to try again.' })
        }
      })

    return () => {
      active = false
    }
  }, [cacheId])

  let content
  if (loading || userId === undefined) {
    content = <Notice>Loading cache…</Notice>
  } else if (result.error) {
    content = <Notice role="alert">{result.error}</Notice>
  } else if (!result.data) {
    content = (
      <Notice>
        We couldn’t find that cache.{' '}
        <Link to="/my-caches" className="font-bold text-black underline">
          Back to my caches
        </Link>
      </Notice>
    )
  } else if (userId === null) {
    content = (
      <Notice>
        {/* Opens the login dialog over this page; it loads by itself after. */}
        <button type="button" onClick={() => openLogin({ reason: 'Log in to edit your cache.' })} aria-haspopup="dialog" className="cursor-pointer font-bold text-black underline">
          Log in
        </button>{' '}
        to edit your cache.
      </Notice>
    )
  } else if (result.data.cache.created_by !== userId) {
    // The database (RLS) has to block this too; this check is just for a clear message.
    content = <Notice>Only the person who hid this cache can edit it.</Notice>
  } else {
    content = (
      <EditCacheForm key={cacheId} cache={result.data.cache} initialHints={result.data.hints} />
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white text-black">
      <SiteHeader />

      <div className="flex w-full flex-col gap-7 p-4 md:gap-6 md:px-8 lg:px-[10%] lg:py-8">
        <h1 className="text-[24px] font-extrabold leading-8 tracking-[-0.25px] md:text-[36px] md:leading-[49px] md:tracking-normal">
          Edit cache
        </h1>
        <p className="text-[14px] font-medium leading-5 text-[#444] md:text-[16px] md:leading-[22px]">
          Changes show up on the map right away.
        </p>
        {content}
      </div>
    </div>
  )
}

export default EditCachePage
