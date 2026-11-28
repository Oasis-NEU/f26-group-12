import { Check, EyeOff, Lock } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import Button from '../components/Button.jsx'
import CacheSlip from '../components/CacheSlip.jsx'
import DescriptionField from '../components/cacheForm/DescriptionField.jsx'
import DifficultyPicker from '../components/cacheForm/DifficultyPicker.jsx'
import FieldMessage from '../components/cacheForm/FieldMessage.jsx'
import FormSection from '../components/cacheForm/FormSection.jsx'
import HintsSection from '../components/cacheForm/HintsSection.jsx'
import WhereSection from '../components/cacheForm/WhereSection.jsx'
import {
  DIFFICULTY_FIRST_ID,
  FADE_IN,
  LOCATION_BUTTON_ID,
  moveToNextField,
  RISE_IN,
} from '../components/cacheForm/formStyles.js'
import { FOCUS_RING } from '../components/focusRing.js'
import { useLoginDialog } from '../components/login/loginDialogContext.js'
import LoginRequired from '../components/login/LoginRequired.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import StatusTag from '../components/StatusTag.jsx'
import TextField from '../components/TextField.jsx'
import { TITLE_MAX_LENGTH } from '../lib/hideCache.js'
import { useEditCache } from '../lib/useEditCache.js'
import { describeSaveError, formSnapshot, prepareCacheEdits, SAVE_TIMEOUT_MS } from './editCacheData.js'

// Edit cache: /caches/:cacheId/edit. From the Figma section "Edit cache ·
// /caches/:cacheId/edit".
//
// The hider changes where their cache is, what it's called, its
// description, difficulty and hints, using the same form pieces as Hide a
// cache (components/cacheForm/), so the two pages always match. The heading
// names the cache, with the same Active / Taken down pill as My caches. The
// secret code is shown locked: it's already printed on the slip inside the
// container, and "Print slip" prints a new one (the shared CacheSlip, as on
// My caches). "Save changes" saves and goes back to My caches, which says
// it saved.
//
// Under the form, "Take down cache" asks first, in the page ("Take it
// down?"), then hides the cache from the map (is_active = false). Caches are
// never deleted. A taken-down cache says so at the top and in that section,
// with "Put it back on the map". Either change saves straight away, so the
// section then says it's done, with a quiet "Back to My caches".
//
// Unsaved changes: closing or reloading the tab asks first (the browser's
// own "Leave site?"), and so does "Cancel", in the page ("Leave without
// saving?"). The header's links can't be stopped yet: that needs the app's
// router to change (React Router's useBlocker only works with a "data
// router"), which is a site-wide change for its own branch.
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
const CANCEL_BUTTON_ID = 'cancel-edit'
const BACK_BUTTON_ID = 'back-to-my-caches'
const LEAVE_HEADING_ID = 'leave-heading'

// The quiet button, for the lesser answer next to a Secondary one: no
// outline, fills Subtle on hover.
const QUIET_BUTTON = `flex h-12 cursor-pointer items-center justify-center rounded-lg px-5 text-label text-text-primary hover:bg-bg-subtle active:scale-97 motion-safe:transition-[background-color,scale] motion-safe:duration-150 motion-safe:ease-out ${FOCUS_RING}`

// Focus moves where the person's attention goes, once the change is drawn.
function focusLater(id) {
  requestAnimationFrame(() => document.getElementById(id)?.focus())
}

// Motion (DESIGN.md): only for changes someone causes, on the shared
// ease-out, under 300ms. starting: is the style each one animates from (CSS
// @starting-style), so it runs when the element is put on the page, never
// on page load here (both only appear after a press).
//   POP_IN  "Take it down?" fades in and grows from 97% out of its top-left
//           corner, where "Take down cache" was (150ms), like the Journal's
//           editors. With reduced motion it only fades.
//           "Leave without saving?" opens the same way.
//   SETTLE  after taking it down or putting it back, the section's new
//           words and button fade in (200ms), and so does the taken-down
//           notice at the top, so the swap reads as the result of the press
//           rather than a flash. Opacity only.
//   RISE_IN the "Done." line fades in and rises 4px (200ms), like My
//           caches' "Saved your changes…"; with reduced motion it fades.
const POP_IN = 'origin-top-left transition-[opacity,scale] duration-150 ease-out starting:opacity-0 motion-safe:starting:scale-97'
const SETTLE = 'transition-opacity duration-200 ease-out starting:opacity-0'

// "K7MQ2X" -> "K 7 M Q 2 X", so screen readers read a code letter by
// letter instead of trying to say it as a word.
function spelled(code) {
  return code.split('').join(' ')
}

// The secret code, locked: in the Subtle fill with a lock, since it can't
// change once it's on the slip.
// "Print slip" prints a new slip (the code is already loaded here).
function LockedCode({ code, onPrint }) {
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
        {code && (
          <div className="pt-1">
            <Button variant="secondary" fullWidth onClick={onPrint} className="lg:w-fit">
              Print slip
            </Button>
          </div>
        )}
      </div>
    </FormSection>
  )
}

// A question asked in the page, in a white card so it reads as one thing
// to answer: "Take it down?" and "Leave without saving?". Escape is the same
// as the lesser answer.
function ConfirmCard({ headingId, heading, children, actions, onEscape }) {
  return (
    <div
      role="group"
      aria-labelledby={headingId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onEscape()
      }}
      className={`mt-2 flex flex-col gap-4 rounded-2xl border border-border-strong bg-bg-surface p-4 lg:p-5 ${POP_IN}`}
    >
      <div className="flex flex-col gap-1">
        <h3 id={headingId} tabIndex={-1} className="text-heading text-text-primary outline-none">
          {heading}
        </h3>
        <p className="text-body text-text-primary">{children}</p>
      </div>
      {actions}
    </div>
  )
}

// "Leave without saving?", with "Leave" and "Keep editing". Opened by
// "Cancel" or "Back to My caches" when the form has unsaved changes.
function LeaveConfirm({ onLeave, onStay }) {
  return (
    <ConfirmCard
      headingId={LEAVE_HEADING_ID}
      heading="Leave without saving?"
      onEscape={onStay}
      actions={
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <Button variant="secondary" fullWidth onClick={onLeave} className="lg:w-fit">
            Leave
          </Button>
          <button type="button" onClick={onStay} className={QUIET_BUTTON}>
            Keep editing
          </button>
        </div>
      }
    >
      Your changes to this cache haven’t been saved. If you leave now, they’re lost.
    </ConfirmCard>
  )
}

// Taking the cache down, and putting it back. "Take down cache" doesn't act
// straight away: it opens "Take it down?" in its place, with "Take down"
// and "Keep it". Escape is the same as "Keep it".
//
// Either change saves straight away, so afterwards the section says so
// ("Done. It’s off the map now. No need to save.") and offers a quiet
// "Back to My caches", which tells My caches what was done.
//
// active: whether the cache is on the map now.
// title: the cache's saved name, for My caches' line ("Took “fens fox” down.").
// onBack(event, state): "Back to My caches" was pressed (it may ask first).
// leaveConfirm: "Leave without saving?" when that's open from here, or null.
function TakeDownSection({ active, title, onTakeDown, onBringBack, onBack, leaveConfirm }) {
  // 'idle' | 'confirming' | 'working'
  const [step, setStep] = useState('idle')
  const [error, setError] = useState('')
  // What was just done on this page: 'down', 'up', or null. Lets the new
  // state fade in (on page load it just appears) and shows the "Done." line.
  const [done, setDone] = useState(null)
  const headingId = useId()
  const confirmId = useId()
  const errorId = useId()
  const doneId = useId()

  function ask() {
    setError('')
    setDone(null)
    setStep('confirming')
    focusLater(confirmId)
  }

  function keep() {
    setStep('idle')
    focusLater(TAKE_DOWN_BUTTON_ID)
  }

  async function run(action, result, failure) {
    if (step === 'working') return
    setError('')
    setStep('working')
    try {
      await action()
      setDone(result)
      setStep('idle')
      // The button they pressed is gone: focus the "Done." line, so screen
      // readers read it out.
      focusLater(doneId)
    } catch {
      setError(failure)
      // Taking down failed: stay on the question so they can try again.
      setStep(active ? 'confirming' : 'idle')
    }
  }

  const working = step === 'working'
  const changed = done !== null
  const message = error && (
    <div role="alert">
      <FieldMessage id={errorId} error={error} />
    </div>
  )

  // "Done." and the way back, once it's been taken down or put back here.
  const doneLine = done && step === 'idle' && (
    <p
      id={doneId}
      tabIndex={-1}
      className={`flex items-start gap-2 rounded-2xl border border-border-subtle bg-bg-surface px-4 py-3 text-body text-text-primary outline-none contrast-more:border-border-input ${RISE_IN}`}
    >
      {/* Ink, not green: green only ever means "found". */}
      <Check aria-hidden="true" size={20} strokeWidth={2.5} className="mt-0.5 shrink-0" />
      <span>{done === 'down' ? 'Done. It’s off the map now. No need to save.' : 'Done. It’s back on the map.'}</span>
    </p>
  )
  const backButton = done && !leaveConfirm && (
    <Link
      id={BACK_BUTTON_ID}
      to="/my-caches"
      state={{ notice: { kind: done, title } }}
      onClick={(event) => onBack(event, { notice: { kind: done, title } })}
      className={QUIET_BUTTON}
    >
      Back to My caches
    </Link>
  )

  if (!active) {
    return (
      // Keyed, so React draws the new state fresh (and it can fade in).
      <section key="down" aria-labelledby={headingId} className="flex flex-col gap-2 border-t border-border-subtle pt-6 contrast-more:border-border-input">
        <h2 id={headingId} tabIndex={-1} className="text-body-strong text-text-primary outline-none">
          This cache is taken down
        </h2>
        {doneLine}
        <p className={`text-small text-text-secondary ${changed ? SETTLE : ''}`}>
          Finders can’t see it on the map or log it. It’s still in the journals of everyone who found it.
        </p>
        <div className={`flex flex-col gap-2 pt-2 lg:flex-row lg:items-center ${changed ? SETTLE : ''}`}>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => run(onBringBack, 'up', 'Couldn’t put it back on the map. Check your connection and try again.')}
            aria-disabled={working || undefined}
            aria-describedby={error ? errorId : undefined}
            className="aria-disabled:cursor-wait lg:w-fit"
          >
            {working ? 'Putting it back…' : 'Put it back on the map'}
          </Button>
          {backButton}
        </div>
        {leaveConfirm}
        {message}
      </section>
    )
  }

  return (
    <section key="up" aria-labelledby={headingId} className="flex flex-col gap-2 border-t border-border-subtle pt-6 contrast-more:border-border-input">
      <h2 id={headingId} tabIndex={-1} className="text-body-strong text-text-primary outline-none">
        Take down this cache
      </h2>
      {step === 'idle' ? (
        <>
          {doneLine}
          <p className={`text-small text-text-secondary ${changed ? SETTLE : ''}`}>
            It disappears from the map, but stays in the journals of everyone who found it.
          </p>
          <div className={`flex flex-col gap-2 pt-2 lg:flex-row lg:items-center ${changed ? SETTLE : ''}`}>
            <Button id={TAKE_DOWN_BUTTON_ID} variant="secondary" fullWidth onClick={ask} className="lg:w-fit">
              Take down cache
            </Button>
            {backButton}
          </div>
          {leaveConfirm}
        </>
      ) : (
        <ConfirmCard
          headingId={confirmId}
          heading="Take it down?"
          onEscape={() => {
            if (!working) keep()
          }}
          actions={
            <>
              {message}
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => run(onTakeDown, 'down', 'Couldn’t take it down. Check your connection and try again.')}
                  aria-disabled={working || undefined}
                  aria-describedby={error ? errorId : undefined}
                  className="aria-disabled:cursor-wait lg:w-fit"
                >
                  {working ? 'Taking it down…' : 'Take down'}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    if (!working) keep()
                  }}
                  className={QUIET_BUTTON}
                >
                  Keep it
                </button>
              </div>
            </>
          }
        >
          It disappears from the map for everyone, but stays in the journals of everyone who found it. You can put it
          back later.
        </ConfirmCard>
      )}
    </section>
  )
}

// The form. It mounts once the cache has loaded, so its starting values come
// straight from `cache` and `initialHints`.
//
// onPrintSlip(): print a new slip for this cache.
function EditCacheForm({ cache, initialHints, edit, onPrintSlip }) {
  const navigate = useNavigate()
  const { openLogin } = useLoginDialog()
  const [form, setForm] = useState(() => ({
    title: cache.title ?? '',
    description: cache.description ?? '',
    locationName: cache.location_name ?? '',
    difficulty: cache.difficulty,
    position: { lat: cache.latitude, lng: cache.longitude },
    // Always show at least one hint field.
    hints: initialHints.length > 0 ? initialHints : [''],
  }))
  // What the form held when it loaded (or when it last didn't need saving),
  // to tell whether there are unsaved changes.
  const [baseline, setBaseline] = useState(() => formSnapshot(form))
  const [problems, setProblems] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  // Whether it's on the map, kept here so taking it down or back shows at once.
  const [active, setActive] = useState(cache.is_active)
  // Whether it's been taken down or put back on this page (lets the
  // taken-down notice at the top fade in; on page load it just appears).
  const [statusChanged, setStatusChanged] = useState(false)
  // "Leave without saving?": null, or where it was opened from ('cancel' or
  // 'back') and what to tell My caches when they leave.
  const [leaving, setLeaving] = useState(null)
  const saved = useRef(false)
  // Whether the page is still open. A save that finishes after they've left
  // (Cancel or a header link pressed during "Saving…") mustn't take them
  // back to My caches.
  const mounted = useRef(true)
  // The latest form, for the take-down handlers, which finish later.
  const latestForm = useRef(form)

  const dirty = formSnapshot(form) !== baseline

  useEffect(() => {
    latestForm.current = form
  }, [form])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

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

  // Unsaved changes: closing or reloading the tab asks first. Browsers show
  // their own "Leave site?" box; the words can't be changed.
  useEffect(() => {
    if (!dirty) return
    function warn(event) {
      event.preventDefault()
      event.returnValue = '' // older browsers need this as well
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    if (problems[field]) setProblems((current) => ({ ...current, [field]: '' }))
  }

  // "Cancel" and "Back to My caches" are links to My caches. With unsaved
  // changes, they ask first instead of going (preventDefault stops the link).
  function askBeforeLeaving(event, from, state = null) {
    if (!dirty) return
    event.preventDefault()
    setLeaving({ from, state })
    focusLater(LEAVE_HEADING_ID)
  }

  function stay() {
    const from = leaving?.from
    setLeaving(null)
    focusLater(from === 'back' ? BACK_BUTTON_ID : CANCEL_BUTTON_ID)
  }

  function leave() {
    navigate('/my-caches', { state: leaving?.state ?? null })
  }

  // Taking it down or putting it back saves by itself, so after either one
  // the page stops warning about unsaved changes (until they change more).
  function statusSaved(nowActive) {
    setActive(nowActive)
    setStatusChanged(true)
    setBaseline(formSnapshot(latestForm.current))
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
      focusLater(target)
      return
    }
    setProblems({})
    setSaving(true)
    // Stop waiting after SAVE_TIMEOUT_MS (a weak signal), as Hide a cache does.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS)
    try {
      await edit.save(values, hints, controller.signal)
      if (!mounted.current) return
      saved.current = true
      // My caches says it saved (see MyCachesPage).
      navigate('/my-caches', { state: { notice: { kind: 'saved', title: values.title } } })
    } catch (error) {
      if (!mounted.current) return
      const { kind, message } = describeSaveError(error)
      setSaveError(message)
      setSaving(false)
      // Their login ran out: the login dialog opens over the page, and
      // everything they typed stays, ready to save once they're back in.
      if (kind === 'signed-out') openLogin({ task: 'save your changes', expired: true })
    } finally {
      clearTimeout(timer)
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

  // A new save problem fades in (150ms).
  const errorMessage = saveError && (
    <p role="alert" className={`text-small text-error ${FADE_IN}`}>
      {saveError}
    </p>
  )

  const leaveConfirm = <LeaveConfirm onLeave={leave} onStay={stay} />

  return (
    <>
      <form id={FORM_ID} noValidate onSubmit={handleSubmit} onKeyDown={moveToNextField} className="flex flex-col gap-7">
        <div className="flex flex-col gap-3">
          {/* The cache's saved name, with the same pill as on My caches. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="min-w-0 wrap-break-word text-title text-text-primary lg:text-section">Edit {cache.title}</h1>
            <StatusTag active={active} />
          </div>
          {active ? (
            <p className="text-small text-text-secondary lg:text-body">Changes show up on the map right away.</p>
          ) : (
            // Taken down: said plainly at the top, not just in the section
            // at the bottom. Keyed, so it fades in when it's just happened.
            <p
              key="taken-down"
              className={`flex items-start gap-2 rounded-lg border border-transparent bg-bg-subtle px-4 py-3 text-small text-text-primary contrast-more:border-border-input lg:text-body ${statusChanged ? SETTLE : ''}`}
            >
              <EyeOff aria-hidden="true" size={18} className="mt-0.5 shrink-0 lg:mt-1" />
              <span>
                This cache is taken down, so finders can’t see it or log it. Your changes show up once it’s back on the
                map.
              </span>
            </p>
          )}
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
            <LockedCode code={cache.secret_code} onPrint={onPrintSlip} />
            {/* Desktop: the buttons sit right under the form, with any save
                problem just above them. "Leave without saving?" opens in
                their place. */}
            <div className="hidden flex-col gap-3 lg:flex">
              {errorMessage}
              {leaving?.from === 'cancel' ? (
                leaveConfirm
              ) : (
                <div className="flex items-center gap-3">
                  {saveButton()}
                  <Button
                    id={CANCEL_BUTTON_ID}
                    to="/my-caches"
                    variant="secondary"
                    onClick={(event) => askBeforeLeaving(event, 'cancel')}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
            <TakeDownSection
              active={active}
              title={cache.title}
              onTakeDown={async () => {
                await edit.takeDown()
                statusSaved(false)
              }}
              onBringBack={async () => {
                await edit.bringBack()
                statusSaved(true)
              }}
              onBack={(event, state) => askBeforeLeaving(event, 'back', state)}
              leaveConfirm={leaving?.from === 'back' ? leaveConfirm : null}
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
  // "Print slip": the slip that's ready to print ({ title, secretCode },
  // with a fresh id each press so printing it twice still prints), as on
  // My caches.
  const [slip, setSlip] = useState(null)

  // Print once the slip is on the page (it's drawn below, hidden on screen).
  useEffect(() => {
    if (slip) window.print()
  }, [slip])

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
          <button
            type="button"
            onClick={edit.retry}
            className={`-my-1 cursor-pointer rounded-lg py-1 font-bold underline ${FOCUS_RING}`}
          >
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
    content = (
      <EditCacheForm
        key={cacheId}
        cache={cache}
        initialHints={edit.data.hints}
        edit={edit}
        // The slip shows the saved name: it's what's on the map.
        onPrintSlip={() => setSlip({ id: Date.now(), title: cache.title, secretCode: cache.secret_code })}
      />
    )
  }

  return (
    <>
      {/* While a slip is ready, printing shows only the slip. */}
      <div className={`flex min-h-dvh flex-col bg-bg-page text-text-primary ${slip ? 'print:hidden' : ''}`}>
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
      {slip && <CacheSlip key={slip.id} cache={slip} />}
    </>
  )
}

export default EditCachePage
