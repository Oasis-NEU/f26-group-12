import { Check, Copy, Plus, RefreshCw } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import Button from '../components/Button.jsx'
import CacheSlip from '../components/CacheSlip.jsx'
import DescriptionField from '../components/cacheForm/DescriptionField.jsx'
import DifficultyPicker from '../components/cacheForm/DifficultyPicker.jsx'
import FormSection from '../components/cacheForm/FormSection.jsx'
import HintsSection from '../components/cacheForm/HintsSection.jsx'
import WhereSection from '../components/cacheForm/WhereSection.jsx'
import { DIFFICULTY_FIRST_ID, LOCATION_BUTTON_ID, RISE_IN, moveToNextField } from '../components/cacheForm/formStyles.js'
import { FOCUS_RING } from '../components/focusRing.js'
import { useLoginDialog } from '../components/login/loginDialogContext.js'
import LoginRequired from '../components/login/LoginRequired.jsx'
import MapPin from '../components/MapPin.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import TextField from '../components/TextField.jsx'
import {
  SAVE_TIMEOUT_MS,
  TITLE_MAX_LENGTH,
  checkCacheForm,
  clearDraft,
  clearHidden,
  createCache,
  describeCreateError,
  generateSecretCode,
  readDraft,
  readHidden,
  saveDraft,
  saveHidden,
} from '../lib/hideCache.js'
import { supabase } from '../lib/supabaseClient.js'
import { useHideCache } from '../lib/useHideCache.js'
import { contourRing } from './cacheDetail/contours.js'

// Hide a cache: /caches/new. From the Figma section "Hide a cache ·
// /caches/new".
//
// The hider sets where it is (a pin on the map, or their current location),
// names and describes it, picks a difficulty, adds up to 3 hints, and gets
// a secret code (the refresh button inside its box makes another).
// create_cache saves it all together. Then "Cache hidden!" shows the code
// once more, with a copy button for phones and "Print a slip" (a page with
// the cache’s name, its code and a line telling finders what to do; the
// form pieces and the slip are shared with Edit cache and My caches, in
// components/cacheForm/ and components/CacheSlip.jsx).
//
// The form is kept for this tab as they type, and so is "Cache hidden!"
// after saving, so a reload or a dropped tab never loses the code or makes
// it look as if nothing saved. Signed-out visitors get the login dialog
// over the page, and the form appears once they've logged in.
// Enter moves to the next field rather than saving, so the keyboard's Go
// can't save half a cache.
//
// Phones (the base styles): one column, "Where is it?" first, with "Hide
// this cache" in a bar at the bottom of the screen. Desktop (lg:): the
// form on the left and "Where is it?" on the right, with "Hide this cache"
// and "Cancel" under the form.

const FORM_ID = 'hide-cache-form'
const HEADING_ID = 'hide-cache-heading'
const TEXT_LINK = `-my-1 w-fit cursor-pointer rounded-sm py-1 text-label text-text-primary underline underline-offset-4 hover:decoration-2 ${FOCUS_RING}`

// "K7MQ2X" -> "K 7 M Q 2 X", so screen readers read a code letter by
// letter instead of trying to say it as a word.
function spelled(code) {
  return code.split('').join(' ')
}

// A 48px icon button that sits inside or beside a box (the code's refresh
// and copy buttons): a quiet icon that darkens on hover, with a Subtle fill.
const ICON_BUTTON = `flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-secondary hover:bg-bg-subtle hover:text-text-primary active:scale-97 motion-safe:transition-[background-color,color,scale] motion-safe:duration-150 motion-safe:ease-out ${FOCUS_RING}`

// The secret code, in JetBrains Mono (the face DESIGN.md keeps for codes),
// with a refresh button inside the box that makes a new random one. Each
// press turns the icon half a turn (250ms, the shared ease-out), and the new
// code fades in from a slight blur (150ms), so it reads as the code
// changing. Reduced motion skips both.
function SecretCodeSection({ code, onChangeCode }) {
  const helpId = useId()
  // How many times it's been pressed: turns the icon, and lets only a code
  // that changed here animate (not the first one on the page).
  const [turns, setTurns] = useState(0)

  function newCode() {
    setTurns((count) => count + 1)
    onChangeCode(generateSecretCode())
  }

  return (
    <FormSection title="Secret code">
      <div className="flex flex-col gap-2">
        <div className="relative">
          <output
            aria-live="polite"
            aria-describedby={helpId}
            className="flex h-14 items-center rounded-lg border border-border-input bg-bg-surface pl-4 pr-14 text-code text-text-primary"
          >
            <span
              key={code}
              className={
                turns
                  ? 'motion-safe:transition-[opacity,filter] motion-safe:duration-150 motion-safe:ease-out motion-safe:starting:opacity-0 motion-safe:starting:blur-[2px]'
                  : ''
              }
            >
              <span aria-hidden="true">{code}</span>
              {/* Read letter by letter, also when a new code is announced. */}
              <span className="sr-only">Your cache’s code: {spelled(code)}</span>
            </span>
          </output>
          <button
            type="button"
            onClick={newCode}
            aria-label="Make a new code"
            title="Make a new code"
            className={`absolute right-1 top-1 ${ICON_BUTTON}`}
          >
            <RefreshCw
              aria-hidden="true"
              size={20}
              style={{ rotate: `${turns * 180}deg` }}
              className="motion-safe:transition-[rotate] motion-safe:duration-250 motion-safe:ease-out"
            />
          </button>
        </div>
        <p id={helpId} className="text-small text-text-secondary">
          We made this code for you. After you save, print it on a slip (or write it down) and put it inside the cache.
          Finders type it in to prove they found it.
        </p>
      </div>
    </FormSection>
  )
}

// Rings for the success screen's pin, worked out once: the cache page's
// contour backdrop, so the new cache looks like a fresh spot on the map.
const SUCCESS_RINGS = Array.from({ length: 12 }, (_, i) => contourRing(0, 0, 34 + i * 30, 2.2 + i * 0.13))

// The new cache's red pin ("still out there to find") at the top of
// contour rings, like the found pin on "Find logged!". The rings are
// decoration: still, faded out just below the pin so no line runs behind
// the text, and gone with Increase Contrast.
function HiddenPin() {
  return (
    <span aria-hidden="true" className="relative isolate flex size-24 items-center justify-center">
      <svg
        viewBox="-600 -400 1200 800"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[800px] w-[1200px] -translate-x-1/2 -translate-y-1/2 text-border-subtle [mask-composite:intersect] [mask-image:radial-gradient(closest-side,black_25%,transparent_75%),linear-gradient(to_bottom,black_38%,transparent_56%)] contrast-more:hidden"
      >
        {SUCCESS_RINGS.map((d) => (
          <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      {/* Grows in from 90% (250ms); see CacheHidden. */}
      <span className="block transition-[opacity,scale] duration-250 ease-out starting:scale-90 starting:opacity-0 motion-reduce:starting:scale-100">
        <span className="block scale-200">
          <MapPin />
        </span>
      </span>
    </span>
  )
}

// "Cache hidden!": the code once more (with a copy button, for a phone at
// the spot where there's no printer), "Print a slip", and where to go next.
// Hiding a cache is the hider's version of "Find logged!", so it gets the
// same short entrance: the pin grows in from 90% (250ms), then the code
// card rises 4px (200ms, from 100ms), done by about 300ms. With reduced
// motion they only fade.
function CacheHidden({ cache, onHideAnother }) {
  // 'idle' | 'copied' | 'failed'. "Copied" shows as a checkmark for 2s.
  const [copy, setCopy] = useState('idle')

  useEffect(() => {
    document.getElementById(HEADING_ID)?.focus()
  }, [])

  useEffect(() => {
    if (copy !== 'copied') return
    const timer = setTimeout(() => setCopy('idle'), 2000)
    return () => clearTimeout(timer)
  }, [copy])

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(cache.secretCode)
      setCopy('copied')
    } catch {
      setCopy('failed')
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[28rem] flex-col items-center gap-5 text-center">
      <HiddenPin />
      <h1 id={HEADING_ID} tabIndex={-1} className="text-display text-text-primary outline-none">
        Cache hidden!
      </h1>
      <p className="text-body text-text-secondary">
        “<span className="wrap-break-word text-text-primary">{cache.title}</span>” is now on the map. Print the slip
        (or write the code down) and put it inside the container.
      </p>
      <div className={`flex w-full flex-col items-center gap-1.5 rounded-2xl bg-bg-subtle p-5 delay-100 ${RISE_IN}`}>
        <p className="text-label text-text-secondary">Secret code</p>
        {/* Bigger than the Code style (Figma's 32px), for reading off the screen. */}
        <div className="flex items-center gap-2 pl-14">
          <p className="font-mono text-[2rem]/[2.75rem] font-bold tracking-[4px] text-text-primary">
            <span aria-hidden="true">{cache.secretCode}</span>
            <span className="sr-only">{spelled(cache.secretCode)}</span>
          </p>
          {/* Copy, then a checkmark for 2s. The check is ink, not green:
              green only ever means "found". The new icon pops in from 75%
              (150ms); reduced motion just swaps it. */}
          <button
            type="button"
            onClick={copyCode}
            aria-label="Copy code"
            title="Copy code"
            // On the Subtle card, the hover fill is a step darker so it shows.
            className={ICON_BUTTON.replace('hover:bg-bg-subtle', 'hover:bg-border-subtle')}
          >
            <span
              key={copy === 'copied' ? 'check' : 'copy'}
              className="block motion-safe:transition-[opacity,scale] motion-safe:duration-150 motion-safe:ease-out motion-safe:starting:scale-75 motion-safe:starting:opacity-0"
            >
              {copy === 'copied' ? (
                <Check aria-hidden="true" size={20} strokeWidth={2.5} className="text-text-primary" />
              ) : (
                <Copy aria-hidden="true" size={20} />
              )}
            </span>
          </button>
        </div>
        {copy === 'failed' && <p className="text-small text-error">Couldn’t copy. Write it down instead.</p>}
        <p className="sr-only" aria-live="polite">
          {copy === 'copied' ? 'Code copied.' : ''}
        </p>
      </div>
      <div className="flex w-full flex-col gap-3">
        {/* Prints just the slip (CacheSlip, at the bottom of the page). */}
        <Button fullWidth onClick={() => window.print()}>
          Print a slip
        </Button>
        <Button to={`/caches/${cache.cacheId}`} variant="secondary" fullWidth>
          View your cache
        </Button>
      </div>
      <div className="flex flex-col gap-1 text-balance text-small text-text-secondary">
        <p>Fold the slip into a small zip bag so it stays dry.</p>
        <p>
          You can see this code again any time on the cache’s{' '}
          <Link to={`/caches/${cache.cacheId}/edit`} className={`${TEXT_LINK} text-small`}>
            edit page
          </Link>
          .
        </p>
      </div>
      {/* The third, lesser action: a quiet button (no outline; fills
          Subtle on hover), under Primary "Print a slip" and Secondary
          "View your cache". 8px below the tips, so it sits with them. */}
      <button
        type="button"
        onClick={onHideAnother}
        className={`-mt-3 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-5 text-label text-text-primary hover:bg-bg-subtle active:scale-97 motion-safe:transition-[background-color,scale] motion-safe:duration-150 motion-safe:ease-out ${FOCUS_RING}`}
      >
        <Plus aria-hidden="true" size={18} />
        Hide another cache
      </button>
    </div>
  )
}

function emptyForm() {
  return {
    title: '',
    description: '',
    locationName: '',
    position: null,
    difficulty: null,
    hints: [''],
    secretCode: generateSecretCode(),
  }
}

function AddCachePage() {
  const { userId } = useHideCache()
  const { openLogin } = useLoginDialog()
  // Starts from the draft kept for this tab, if any (with a new code only
  // if it had none).
  const [form, setForm] = useState(() => {
    const draft = readDraft()
    return draft ? { ...draft, secretCode: draft.secretCode ?? generateSecretCode() } : emptyForm()
  })
  const [problems, setProblems] = useState({})
  // A save problem: { message, mayHaveSaved } or null. mayHaveSaved (a slow
  // save) adds a link to My caches, so they check before trying again.
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  // After saving: { cacheId, secretCode, title }, kept for this tab.
  const [hidden, setHidden] = useState(readHidden)
  // Set when the login ran out mid-form.
  const [needsLogin, setNeedsLogin] = useState(false)
  // Bumped by "Hide another cache", so the form starts fresh (new hint keys).
  const [formVersion, setFormVersion] = useState(0)
  const firstRender = useRef(true)

  // Keep the form for this tab as they go (not before they've touched it).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (!hidden) saveDraft(form)
  }, [form, hidden])

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
    event.preventDefault()
    if (submitting) return
    setFormError(null)
    const found = checkCacheForm(form)
    setProblems(found)
    // Move to the first problem, in the order the form shows them. For a
    // missing spot that's the location button, which the error describes.
    const first = ['position', 'title', 'difficulty'].find((field) => found[field])
    if (first) {
      const target = { position: LOCATION_BUTTON_ID, title: 'cache-title', difficulty: DIFFICULTY_FIRST_ID }[first]
      requestAnimationFrame(() => document.getElementById(target)?.focus())
      return
    }
    setSubmitting(true)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS)
    try {
      const saved = await createCache(supabase, form, controller.signal)
      const result = { ...saved, title: form.title.trim() }
      saveHidden(result)
      clearDraft()
      setHidden(result)
      window.scrollTo({ top: 0 })
    } catch (error) {
      const { kind, message } = describeCreateError(error)
      if (kind === 'signed-out') setNeedsLogin(true)
      else setFormError({ message, mayHaveSaved: kind === 'timeout' })
    } finally {
      clearTimeout(timer)
      setSubmitting(false)
    }
  }

  function hideAnother() {
    clearHidden()
    clearDraft()
    setForm(emptyForm())
    setFormVersion((count) => count + 1)
    setProblems({})
    setFormError(null)
    setHidden(null)
    window.scrollTo({ top: 0 })
    // The button that was pressed is gone, so start keyboard focus at the
    // top of the new form.
    requestAnimationFrame(() => document.getElementById(HEADING_ID)?.focus())
  }

  // The submit button. While working it stays red and says so; aria-disabled
  // marks it busy and the form ignores more presses.
  function submitButton(className = '') {
    return (
      <Button
        type="submit"
        form={FORM_ID}
        aria-disabled={submitting || undefined}
        className={`aria-disabled:cursor-wait ${className}`}
      >
        {submitting ? 'Hiding…' : 'Hide this cache'}
      </Button>
    )
  }

  // A save problem, with a link to My caches when it may have saved anyway.
  const errorMessage = formError && (
    <p role="alert" className="text-small text-error">
      {formError.message}{' '}
      {formError.mayHaveSaved && (
        <Link to="/my-caches" className={`${TEXT_LINK} text-small`}>
          Go to My caches
        </Link>
      )}
    </p>
  )

  let content = null
  let title = 'Hide a cache'
  if (userId === undefined) {
    content = (
      <p role="status" className="text-body text-text-secondary">
        Loading…
      </p>
    )
  } else if (hidden) {
    title = 'Cache hidden!'
    content = <CacheHidden cache={hidden} onHideAnother={hideAnother} />
  } else if (userId === null) {
    // Signed out: the login dialog opens over this, and the form appears
    // once they've logged in (useHideCache notices by itself).
    title = 'Log in to hide a cache'
    content = (
      <div className="pb-8 lg:pt-4">
        <LoginRequired
          heading="Log in to hide a cache"
          headingId={HEADING_ID}
          task="hide a cache"
          onLoggedIn={() => setNeedsLogin(false)}
        >
          Hiding a cache needs an account, so it’s saved as yours and you can edit it later.
        </LoginRequired>
      </div>
    )
  } else if (needsLogin) {
    title = 'Log in again'
    content = (
      <div className="flex max-w-[28rem] flex-col gap-4">
        <h1 id={HEADING_ID} tabIndex={-1} className="text-title text-text-primary outline-none lg:text-display">
          Log in again to hide your cache
        </h1>
        <p className="text-body text-text-primary">
          Your login ran out. Everything you filled in is kept, so it’ll be here once you’ve logged in.
        </p>
        {/* Opens the login dialog; once they're back in, the form returns
            as they left it. */}
        <Button
          onClick={() =>
            openLogin({ task: 'hide your cache', expired: true, onLoggedIn: () => setNeedsLogin(false) })
          }
          aria-haspopup="dialog"
          fullWidth
          className="lg:w-fit"
        >
          Log in
        </Button>
      </div>
    )
  } else if (userId) {
    content = (
      <>
        <form
          key={formVersion}
          id={FORM_ID}
          noValidate
          onSubmit={handleSubmit}
          onKeyDown={moveToNextField}
          className="flex flex-col gap-7"
        >
          <div className="flex flex-col gap-3">
            <h1 id={HEADING_ID} tabIndex={-1} className="text-title text-text-primary outline-none lg:text-section">
              Hide a cache
            </h1>
            <p className="text-small text-text-secondary lg:text-body">
              Fill in the details, then put the code inside your container.
            </p>
          </div>
          {/* Phones: "Where is it?" first (you're often standing at the spot).
              Desktop: the form on the left, "Where is it?" on the right; the
              right column narrows at smaller desktops so the form has room. */}
          <div className="flex flex-col gap-7 lg:flex-row-reverse lg:items-start lg:gap-12">
            <div className="flex flex-col gap-7 lg:sticky lg:top-6 lg:w-[22rem] lg:shrink-0 xl:w-[30rem]">
              <WhereSection
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
              <SecretCodeSection code={form.secretCode} onChangeCode={(value) => update('secretCode', value)} />
              {/* Desktop: the buttons sit right under the form, with any save
                  problem just above them. */}
              <div className="hidden flex-col gap-3 lg:flex">
                {errorMessage}
                <div className="flex items-center gap-3">
                  {submitButton()}
                  <Button to="/map" variant="secondary">
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
        {/* Phones: "Hide this cache" is pinned to the bottom of the screen,
            with any save problem right above it, where it's seen. */}
        <div className="sticky bottom-0 z-20 -mx-4 mt-auto flex flex-col gap-3 border-t border-border-subtle bg-bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] contrast-more:border-border-input lg:hidden">
          {errorMessage}
          {submitButton('w-full')}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="flex min-h-dvh flex-col bg-bg-page text-text-primary print:hidden">
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
          <div
            className={`flex w-full flex-1 flex-col gap-5 overflow-clip px-4 lg:px-[10%] ${
              hidden ? 'pb-8 pt-16 lg:pt-24' : 'pt-4 lg:pb-12 lg:pt-8'
            }`}
          >
            {content}
          </div>
        </main>
      </div>
      {hidden && <CacheSlip cache={hidden} />}
    </>
  )
}

export default AddCachePage
