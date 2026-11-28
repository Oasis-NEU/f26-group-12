import { Lock } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import Button from '../components/Button.jsx'
import DescriptionField from '../components/cacheForm/DescriptionField.jsx'
import DifficultyPicker from '../components/cacheForm/DifficultyPicker.jsx'
import FieldMessage from '../components/cacheForm/FieldMessage.jsx'
import FormSection from '../components/cacheForm/FormSection.jsx'
import HintsSection from '../components/cacheForm/HintsSection.jsx'
import WhereSection from '../components/cacheForm/WhereSection.jsx'
import { DIFFICULTY_FIRST_ID, LOCATION_BUTTON_ID, moveToNextField } from '../components/cacheForm/formStyles.js'
import { FOCUS_RING } from '../components/focusRing.js'
import LoginRequired from '../components/login/LoginRequired.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import TextField from '../components/TextField.jsx'
import { TITLE_MAX_LENGTH } from '../lib/hideCache.js'
import { useEditCache } from '../lib/useEditCache.js'
import { prepareCacheEdits } from './editCacheData.js'

// Edit cache: /caches/:cacheId/edit. From the Figma section "Edit cache ·
// /caches/:cacheId/edit".
//
// The hider changes where their cache is, what it's called, its
// description, difficulty and hints, using the same form pieces as Hide a
// cache (components/cacheForm/), so the two pages always match. The secret
// code is shown locked: it's already printed on the slip inside the
// container. "Save changes" saves and goes back to My caches, which says it
// saved.
//
// Under the form, "Take down cache" asks first, in the page ("Take it
// down?"), then hides the cache from the map (is_active = false). Caches are
// never deleted. A taken-down cache says so, with "Put it back on the map".
//
// Only the person who hid a cache can edit it: anyone else gets a short
// message (the database checks this too). Signed-out visitors get the login
// dialog over the page. The data comes from useEditCache (src/lib).
//
// Phones (the base styles): one column, "Where is it?" first, with "Save
// changes" in a bar at the bottom of the screen. Desktop (lg:): the form on
// the left and "Where is it?" on the right, with "Save changes" and
// "Cancel" under the form.

const FORM_ID = 'edit-cache-form'
const TAKE_DOWN_BUTTON_ID = 'take-down-button'

// "K7MQ2X" -> "K 7 M Q 2 X", so screen readers read a code letter by
// letter instead of trying to say it as a word.
function spelled(code) {
  return code.split('').join(' ')
}

// The secret code, locked: in the Subtle fill with a lock, since it can't
// change once it's on the slip.
function LockedCode({ code }) {
  const labelId = useId()
  const helpId = useId()
  return (
    <FormSection title="Secret code">
      <div className="flex flex-col gap-2">
        <p id={labelId} className="text-label text-text-primary">
          Your cache’s code
        </p>
        <div
          role="group"
          aria-labelledby={labelId}
          aria-describedby={helpId}
          className="flex h-14 items-center justify-between gap-3 rounded-lg border border-border-input bg-bg-subtle px-4"
        >
          {code ? (
            <p className="text-code text-text-primary">
              <span aria-hidden="true">{code}</span>
              <span className="sr-only">{spelled(code)}</span>
            </p>
          ) : (
            <p className="text-small text-text-secondary">The code couldn’t load. Refresh the page to see it.</p>
          )}
          <Lock aria-hidden="true" size={18} className="shrink-0 text-text-secondary" />
        </div>
        <p id={helpId} className="text-small text-text-secondary">
          The code can’t be changed, because it’s already on the slip inside the container.
        </p>
      </div>
    </FormSection>
  )
}

// Taking the cache down, and putting it back. "Take down cache" doesn't act
// straight away: it opens "Take it down?" in its place, with "Take down"
// and "Keep it". Escape is the same as "Keep it".
//
// active: whether the cache is on the map now.
function TakeDownSection({ active, onTakeDown, onBringBack }) {
  // 'idle' | 'confirming' | 'working'
  const [step, setStep] = useState('idle')
  const [error, setError] = useState('')
  const headingId = useId()
  const confirmId = useId()
  const errorId = useId()

  // Focus moves where the person's attention goes: into the question when
  // it opens, back to the button when they keep it, and to the section's
  // new heading once it's taken down or back (the button they pressed is
  // gone). Done after the change is drawn.
  function focusLater(id) {
    requestAnimationFrame(() => document.getElementById(id)?.focus())
  }

  function ask() {
    setError('')
    setStep('confirming')
    focusLater(confirmId)
  }

  function keep() {
    setStep('idle')
    focusLater(TAKE_DOWN_BUTTON_ID)
  }

  async function run(action, failure) {
    if (step === 'working') return
    setError('')
    setStep('working')
    try {
      await action()
      setStep('idle')
      focusLater(headingId)
    } catch {
      setError(failure)
      // Taking down failed: stay on the question so they can try again.
      setStep(active ? 'confirming' : 'idle')
    }
  }

  const working = step === 'working'
  const message = error && (
    <div role="alert">
      <FieldMessage id={errorId} error={error} />
    </div>
  )

  if (!active) {
    return (
      <section aria-labelledby={headingId} className="flex flex-col gap-2 border-t border-border-subtle pt-6 contrast-more:border-border-input">
        <h2 id={headingId} tabIndex={-1} className="text-body-strong text-text-primary outline-none">
          This cache is taken down
        </h2>
        <p className="text-small text-text-secondary">
          Finders can’t see it on the map or log it. It’s still in the journals of everyone who found it.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => run(onBringBack, 'Couldn’t put it back on the map. Check your connection and try again.')}
            aria-disabled={working || undefined}
            aria-describedby={error ? errorId : undefined}
            className="aria-disabled:cursor-wait lg:w-fit"
          >
            {working ? 'Putting it back…' : 'Put it back on the map'}
          </Button>
          {message}
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2 border-t border-border-subtle pt-6 contrast-more:border-border-input">
      <h2 id={headingId} tabIndex={-1} className="text-body-strong text-text-primary outline-none">
        Take down this cache
      </h2>
      {step === 'idle' ? (
        <>
          <p className="text-small text-text-secondary">
            It disappears from the map, but stays in the journals of everyone who found it.
          </p>
          <div className="pt-2">
            <Button id={TAKE_DOWN_BUTTON_ID} variant="secondary" fullWidth onClick={ask} className="lg:w-fit">
              Take down cache
            </Button>
          </div>
        </>
      ) : (
        // The question, in a white card so it reads as one thing to answer.
        <div
          role="group"
          aria-labelledby={confirmId}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !working) keep()
          }}
          className="mt-2 flex flex-col gap-4 rounded-2xl border border-border-strong bg-bg-surface p-4 lg:p-5"
        >
          <div className="flex flex-col gap-1">
            <h3 id={confirmId} tabIndex={-1} className="text-heading text-text-primary outline-none">
              Take it down?
            </h3>
            <p className="text-body text-text-primary">
              It disappears from the map for everyone, but stays in the journals of everyone who found it. You can put
              it back later.
            </p>
          </div>
          {message}
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => run(onTakeDown, 'Couldn’t take it down. Check your connection and try again.')}
              aria-disabled={working || undefined}
              aria-describedby={error ? errorId : undefined}
              className="aria-disabled:cursor-wait lg:w-fit"
            >
              {working ? 'Taking it down…' : 'Take down'}
            </Button>
            {/* The lesser answer: a quiet button (no outline; fills Subtle on hover). */}
            <button
              type="button"
              onClick={() => {
                if (!working) keep()
              }}
              className={`flex h-12 cursor-pointer items-center justify-center rounded-lg px-5 text-label text-text-primary hover:bg-bg-subtle active:scale-97 motion-safe:transition-[background-color,scale] motion-safe:duration-150 motion-safe:ease-out ${FOCUS_RING}`}
            >
              Keep it
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

// The form. It mounts once the cache has loaded, so its starting values come
// straight from `cache` and `initialHints`.
function EditCacheForm({ cache, initialHints, edit }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: cache.title ?? '',
    description: cache.description ?? '',
    locationName: cache.location_name ?? '',
    difficulty: cache.difficulty,
    position: { lat: cache.latitude, lng: cache.longitude },
    // Always show at least one hint field.
    hints: initialHints.length > 0 ? initialHints : [''],
  })
  const [problems, setProblems] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  // Whether it's on the map, kept here so taking it down or back shows at once.
  const [active, setActive] = useState(cache.is_active)
  const saved = useRef(false)

  // Phones: leave room for the bottom bar when the browser scrolls a field
  // into view (e.g. the keyboard opening), so it never hides behind it.
  useEffect(() => {
    const root = document.documentElement
    const before = root.style.scrollPaddingBottom
    root.style.scrollPaddingBottom = '6rem'
    return () => {
      root.style.scrollPaddingBottom = before
    }
  }, [])

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    if (problems[field]) setProblems((current) => ({ ...current, [field]: '' }))
  }

  async function handleSubmit(event) {
    event.preventDefault() // stop the browser's default full-page form submit
    if (saving || saved.current) return
    setSaveError('')
    const { values, hints, errors } = prepareCacheEdits(form)
    if (errors) {
      setProblems(errors)
      // Move to the first problem, in the order the form shows them.
      const first = ['position', 'title', 'difficulty'].find((field) => errors[field])
      const target = { position: LOCATION_BUTTON_ID, title: 'cache-title', difficulty: DIFFICULTY_FIRST_ID }[first]
      requestAnimationFrame(() => document.getElementById(target)?.focus())
      return
    }
    setProblems({})
    setSaving(true)
    try {
      await edit.save(values, hints)
      saved.current = true
      // My caches says it saved (see MyCachesPage).
      navigate('/my-caches', { state: { savedTitle: values.title } })
    } catch {
      setSaveError('Your changes didn’t save. Check your connection and try again.')
      setSaving(false)
    }
  }

  // The save button. While working it stays red and says so; aria-disabled
  // marks it busy and the form ignores more presses.
  function saveButton(className = '') {
    return (
      <Button type="submit" form={FORM_ID} aria-disabled={saving || undefined} className={`aria-disabled:cursor-wait ${className}`}>
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    )
  }

  const errorMessage = saveError && (
    <p role="alert" className="text-small text-error">
      {saveError}
    </p>
  )

  return (
    <>
      <form id={FORM_ID} noValidate onSubmit={handleSubmit} onKeyDown={moveToNextField} className="flex flex-col gap-7">
        <div className="flex flex-col gap-3">
          <h1 className="text-title text-text-primary lg:text-section">Edit cache</h1>
          <p className="text-small text-text-secondary lg:text-body">
            {active
              ? 'Changes show up on the map right away.'
              : 'This cache is taken down. Your changes show up once it’s back on the map.'}
          </p>
        </div>
        {/* Phones: "Where is it?" first. Desktop: the form on the left,
            "Where is it?" on the right, as on Hide a cache. */}
        <div className="flex flex-col gap-7 lg:flex-row-reverse lg:items-start lg:gap-12">
          <div className="flex flex-col gap-7 lg:sticky lg:top-6 lg:w-[22rem] lg:shrink-0 xl:w-[30rem]">
            <WhereSection
              startsPlaced
              position={form.position}
              onPosition={(value) => update('position', value)}
              locationName={form.locationName}
              onLocationName={(value) => update('locationName', value)}
              error={problems.position}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-7">
            <FormSection title="What is it?">
              <TextField
                id="cache-title"
                label="Cache name"
                placeholder="e.g. Husky Hideout"
                help="A name for the cache, not a clue to where it is."
                maxLength={TITLE_MAX_LENGTH}
                enterKeyHint="next"
                aria-required="true"
                value={form.title}
                onChange={(event) => update('title', event.target.value)}
                error={problems.title}
              />
              <DescriptionField value={form.description} onChange={(value) => update('description', value)} />
              <DifficultyPicker
                value={form.difficulty}
                onChange={(value) => update('difficulty', value)}
                error={problems.difficulty}
              />
            </FormSection>
            <HintsSection hints={form.hints} onChange={(value) => update('hints', value)} />
            <LockedCode code={cache.secret_code} />
            {/* Desktop: the buttons sit right under the form, with any save
                problem just above them. */}
            <div className="hidden flex-col gap-3 lg:flex">
              {errorMessage}
              <div className="flex items-center gap-3">
                {saveButton()}
                <Button to="/my-caches" variant="secondary">
                  Cancel
                </Button>
              </div>
            </div>
            <TakeDownSection
              active={active}
              onTakeDown={async () => {
                await edit.takeDown()
                setActive(false)
              }}
              onBringBack={async () => {
                await edit.bringBack()
                setActive(true)
              }}
            />
          </div>
        </div>
      </form>
      {/* Phones: "Save changes" is pinned to the bottom of the screen, with
          any save problem right above it, where it's seen. */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-auto flex flex-col gap-3 border-t border-border-subtle bg-bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] contrast-more:border-border-input lg:hidden">
        {errorMessage}
        {saveButton('w-full')}
      </div>
    </>
  )
}

// A page-level message in place of the form (not found, not yours): a
// heading, a sentence and one way on.
function StateMessage({ heading, children, action }) {
  return (
    <div className="flex max-w-[28rem] flex-col gap-4 pb-8 lg:pt-4">
      <h1 className="text-title text-text-primary lg:text-display">{heading}</h1>
      <p className="text-body text-text-primary">{children}</p>
      {action}
    </div>
  )
}

function EditCachePage() {
  const { cacheId } = useParams()
  const edit = useEditCache(cacheId)
  const cache = edit.data?.cache

  let title = 'Edit cache'
  let content
  if (edit.userId === null) {
    // Signed out: the login dialog opens over this, and the form appears
    // once they've logged in (useEditCache notices by itself).
    title = 'Log in to edit your cache'
    content = (
      <div className="pb-8 lg:pt-4">
        <LoginRequired heading="Log in to edit your cache" task="edit your cache">
          Only the person who hid a cache can edit it, so log in with the account you hid it with.
        </LoginRequired>
      </div>
    )
  } else if (edit.userId === undefined || edit.loading) {
    content = (
      <p role="status" className="text-body text-text-secondary">
        Loading your cache…
      </p>
    )
  } else if (edit.error) {
    content = (
      <StateMessage heading="Edit cache">
        <span role="alert">
          This cache couldn’t load. Check your connection and{' '}
          <button type="button" onClick={edit.retry} className={`cursor-pointer rounded-lg font-bold underline ${FOCUS_RING}`}>
            try again
          </button>
          .
        </span>
      </StateMessage>
    )
  } else if (!cache) {
    // No such cache, or someone else's taken-down one (RLS hides those).
    title = 'Cache not found'
    content = (
      <StateMessage
        heading="We couldn’t find that cache"
        action={
          <Button to="/my-caches" fullWidth className="lg:w-fit">
            Go to My caches
          </Button>
        }
      >
        It may have been taken down, or the link is wrong.
      </StateMessage>
    )
  } else if (cache.created_by !== edit.userId) {
    // The database (RLS) blocks the save too; this is just a clear message.
    title = 'Not your cache'
    content = (
      <StateMessage
        heading="This isn’t your cache"
        action={
          <Button to={`/caches/${cache.id}`} fullWidth className="lg:w-fit">
            View the cache
          </Button>
        }
      >
        Only the person who hid a cache can edit it.
      </StateMessage>
    )
  } else {
    title = `Edit ${cache.title}`
    content = <EditCacheForm key={cacheId} cache={cache} initialHints={edit.data.hints} edit={edit} />
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg-page text-text-primary">
      <title>{`${title} · HuskyCache`}</title>
      {/* Hidden until someone presses Tab, so keyboard users can jump past the header. */}
      <a
        href="#main-content"
        className={`sr-only rounded-lg bg-bg-surface px-4 py-2 text-label text-text-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 ${FOCUS_RING}`}
      >
        Skip to content
      </a>
      <SiteHeader />
      {/* The page's own <main> (Layout leaves it out here), with the header outside it. */}
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <div className="flex w-full flex-1 flex-col gap-5 overflow-clip px-4 pt-4 lg:px-[10%] lg:pb-12 lg:pt-8">
          {content}
        </div>
      </main>
    </div>
  )
}

export default EditCachePage
