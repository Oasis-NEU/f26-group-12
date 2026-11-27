import { LocateFixed, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import Button from '../components/Button.jsx'
import DifficultyMeter from '../components/DifficultyMeter.jsx'
import { FOCUS_RING } from '../components/focusRing.js'
import LocationPicker from '../components/LocationPicker.jsx'
import MapPin from '../components/MapPin.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import TextField from '../components/TextField.jsx'
import {
  DESCRIPTION_MAX_LENGTH,
  HINT_MAX_LENGTH,
  LOCATION_MAX_LENGTH,
  MAX_HINTS,
  SAVE_TIMEOUT_MS,
  TITLE_MAX_LENGTH,
  checkCacheForm,
  clearDraft,
  createCache,
  describeCreateError,
  generateSecretCode,
  readDraft,
  saveDraft,
} from '../lib/hideCache.js'
import { supabase } from '../lib/supabaseClient.js'
import { useHideCache } from '../lib/useHideCache.js'
import { contourRing } from './cacheDetail/contours.js'

// Hide a cache: /caches/new. From the Figma section "Hide a cache ·
// /caches/new".
//
// The hider sets where it is (a pin on the map, or their current location),
// names and describes it, picks a difficulty, adds up to 3 hints, and gets
// a secret code ("New code" makes another). create_cache saves it all
// together. Then "Cache hidden!" shows the code once more, with "Print a
// slip": a page with just the cache's name and code, to cut out and put
// inside the container.
//
// The form is kept for this tab as they type (a reload or a trip to log in
// doesn't lose it, and the code doesn't change after they've written it
// down). Signed-out visitors are sent to log in and come back here.
//
// Phones (the base styles): one column, "Where is it?" first, with "Hide
// this cache" in a bar at the bottom of the screen. Desktop (lg:): the
// form on the left and "Where is it?" on the right, with "Hide this cache"
// and "Cancel" under the form.

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const FORM_ID = 'hide-cache-form'
const HEADING_ID = 'hide-cache-heading'
const TEXT_LINK = `-my-1 w-fit cursor-pointer rounded-sm py-1 text-label text-text-primary underline underline-offset-4 hover:decoration-2 ${FOCUS_RING}`
// Something that just appeared fades in and rises 4px (200ms, the shared
// ease-out), like a hint being revealed; with reduced motion it only
// fades. starting: is the style it animates from (CSS @starting-style).
const RISE_IN =
  'transition-[opacity,translate] duration-200 ease-out starting:translate-y-1 starting:opacity-0 motion-reduce:starting:translate-y-0'
// A message that just appeared fades in (150ms).
const FADE_IN = 'transition-opacity duration-150 ease-out starting:opacity-0'
const FIELD_BOX = `w-full rounded-lg border border-border-input bg-bg-surface px-4 text-body text-text-primary placeholder:text-text-secondary ${FOCUS_RING}`

// A part of the form ("Where is it?", "What is it?"...), labelled by its
// heading. headingId lets the form move focus to the heading (tabIndex -1).
function Section({ title, headingId, children }) {
  const generatedId = useId()
  const id = headingId ?? generatedId
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} tabIndex={-1} className="text-heading text-text-primary outline-none">
        {title}
      </h2>
      {children}
    </section>
  )
}

// An error or help line under a field, with the "!" icon for errors (as
// in TextField).
function FieldMessage({ id, error, help }) {
  if (!error && !help) return null
  return (
    <div id={id} key={error || 'help'} className={`flex items-start gap-2 ${error ? FADE_IN : ''}`}>
      {error && (
        <span
          aria-hidden="true"
          className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-error font-display text-[12px]/[14px] font-bold text-text-on-accent"
        >
          !
        </span>
      )}
      <p className={`text-small ${error ? 'text-error' : 'text-text-secondary'}`}>{error || help}</p>
    </div>
  )
}

// The description: a 96px box, same look as a text field.
function DescriptionField({ value, onChange }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-label text-text-primary">
        Description (optional)
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="What should finders know? Size, what it looks like…"
        maxLength={DESCRIPTION_MAX_LENGTH}
        rows={3}
        className={`min-h-24 resize-y py-3 ${FIELD_BOX}`}
      />
    </div>
  )
}

// Difficulty 1-5: five big options, one picked at a time (radio buttons,
// so arrow keys move between them). The picked one is the Inverse fill,
// and bars beside the label show it the way difficulty always appears.
// (The legend has to be the fieldset's first child to name the group, so
// it's for screen readers; the visible row repeats it with the bars.)
function DifficultyPicker({ value, onChange, error }) {
  const messageId = useId()
  return (
    <fieldset aria-describedby={messageId} className="flex flex-col gap-2">
      <legend className="sr-only">Difficulty</legend>
      <div aria-hidden="true" className="flex items-center justify-between gap-4">
        <span className="text-label text-text-primary">Difficulty</span>
        {value && <DifficultyMeter level={value} showLabel={false} />}
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((level) => (
          <label
            key={level}
            // The fill eases in (150ms) and the option shrinks to 97% while
            // pressed, like a Button, so a tap feels heard.
            className={`flex h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border text-body-strong active:scale-97 motion-safe:transition-[background-color,border-color,color,scale] motion-safe:duration-150 motion-safe:ease-out has-focus-visible:ring-2 has-focus-visible:ring-focus has-focus-visible:ring-offset-2 ${
              value === level
                ? 'border-bg-inverse bg-bg-inverse text-text-on-accent'
                : `bg-bg-surface text-text-primary hover:bg-bg-subtle ${error ? 'border-error' : 'border-border-strong'}`
            }`}
          >
            <input
              id={level === 1 ? 'difficulty-1' : undefined}
              type="radio"
              name="difficulty"
              value={level}
              checked={value === level}
              onChange={() => onChange(level)}
              className="sr-only"
            />
            {level}
          </label>
        ))}
      </div>
      <FieldMessage id={messageId} error={error} help="1 = easy to spot, 5 = a real challenge" />
    </fieldset>
  )
}

// "Where is it?": the map to place the pin (when Google Maps is set up),
// and "Use my current location", which works without a map and is quickest
// when you're standing at the spot. The browser asks first; the location
// only sets the pin and is saved as the cache's spot.
function WhereSection({ position, onPosition, locationName, onLocationName, error }) {
  const [locating, setLocating] = useState('idle')
  const messageId = useId()

  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      setLocating('unavailable')
      return
    }
    setLocating('locating')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onPosition({ lat: coords.latitude, lng: coords.longitude })
        setLocating('idle')
      },
      (failure) => setLocating(failure.code === failure.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  const locateMessage = {
    locating: 'Finding where you are…',
    denied: 'Location is off for this site. Allow it in your browser’s settings, or place the pin on the map.',
    unavailable: 'Your location isn’t available right now. Try again outside, or place the pin on the map.',
  }[locating]

  return (
    <Section title="Where is it?" headingId="where-heading">
      {GOOGLE_MAPS_API_KEY ? (
        <LocationPicker
          position={position}
          onChange={onPosition}
          className="h-[180px] overflow-hidden rounded-2xl lg:h-[360px]"
        />
      ) : (
        // No map here yet: a frame like the cache page's "no photo" one,
        // pointing to the location button below.
        <div className="flex h-[180px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border-input px-6 text-center contrast-more:border-text-secondary lg:h-[360px]">
          <p className="text-body-strong text-text-primary">
            {position ? 'Pin set to your location' : 'The map isn’t set up here yet'}
          </p>
          <p className="text-small text-text-secondary">
            {position
              ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`
              : 'Stand at the cache and use your current location.'}
          </p>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          fullWidth
          onClick={useMyLocation}
          aria-disabled={locating === 'locating' || undefined}
          aria-describedby={messageId}
          className="gap-2 aria-disabled:cursor-wait lg:w-fit"
        >
          <LocateFixed aria-hidden="true" size={18} />
          {position ? 'Use my current location again' : 'Use my current location'}
        </Button>
        <div aria-live="polite">
          <FieldMessage
            id={messageId}
            error={error}
            help={locateMessage ?? 'Sets the pin to where you’re standing.'}
          />
        </div>
      </div>
      <TextField
        label="Location name (optional)"
        placeholder="e.g. near Snell Library"
        maxLength={LOCATION_MAX_LENGTH}
        value={locationName}
        onChange={(event) => onLocationName(event.target.value)}
      />
    </Section>
  )
}

// Hints: up to 3, in order. Each one after the first can be removed.
function HintsSection({ hints, onChange }) {
  const listId = useId()

  function setHint(index, text) {
    onChange(hints.map((hint, i) => (i === index ? text : hint)))
  }

  function addHint() {
    onChange([...hints, ''])
    // Move to the new field, so they can type straight away.
    requestAnimationFrame(() => document.getElementById(`${listId}-${hints.length}`)?.focus())
  }

  function removeHint(index) {
    onChange(hints.filter((_, i) => i !== index))
    requestAnimationFrame(() => document.getElementById(`${listId}-${Math.max(0, index - 1)}`)?.focus())
  }

  return (
    <Section title="Hints (optional, up to 3)">
      <p className="-mt-2 text-small text-text-secondary">Start vague. Each hint should give away a little more.</p>
      {hints.map((hint, index) => (
        <TextField
          key={index}
          className={index > 0 ? RISE_IN : ''}
          id={`${listId}-${index}`}
          label={`Hint ${index + 1}`}
          placeholder={index === 0 ? 'e.g. Sit on the steps and look down' : undefined}
          maxLength={HINT_MAX_LENGTH}
          value={hint}
          onChange={(event) => setHint(index, event.target.value)}
          action={
            index > 0 && (
              <button
                type="button"
                onClick={() => removeHint(index)}
                aria-label={`Remove hint ${index + 1}`}
                className={`flex size-10 cursor-pointer items-center justify-center rounded-lg text-text-secondary hover:text-text-primary ${FOCUS_RING}`}
              >
                <X aria-hidden="true" size={18} />
              </button>
            )
          }
        />
      ))}
      {hints.length < MAX_HINTS && (
        <button type="button" onClick={addHint} className={TEXT_LINK}>
          + Add another hint
        </button>
      )}
    </Section>
  )
}

// The secret code: shown in JetBrains Mono (the face DESIGN.md keeps for
// codes), with "New code" to make another before saving.
function SecretCodeSection({ code, onNewCode }) {
  const helpId = useId()
  return (
    <Section title="Secret code">
      <div className="flex flex-col gap-2">
        <p className="text-label text-text-primary">Your cache’s code</p>
        <div className="flex items-stretch gap-2">
          <output
            aria-live="polite"
            aria-describedby={helpId}
            className="flex h-12 min-w-0 flex-1 items-center rounded-lg border border-border-input bg-bg-surface px-4 text-code text-text-primary"
          >
            {/* Keyed by the code, so each new one fades in from a slight
                blur (150ms): it reads as the code changing, not a flicker. */}
            <span
              key={code}
              className="motion-safe:transition-[opacity,filter] motion-safe:duration-150 motion-safe:ease-out motion-safe:starting:opacity-0 motion-safe:starting:blur-[2px]"
            >
              {code}
            </span>
          </output>
          <Button variant="secondary" onClick={onNewCode}>
            New code
          </Button>
        </div>
        <p id={helpId} className="text-small text-text-secondary">
          We made this code for you. Write it on a slip and put it inside the cache. Finders type it in to prove they
          found it.
        </p>
      </div>
    </Section>
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

// "Cache hidden!": the code once more, "Print a slip", and where to go next.
// Hiding a cache is the hider's version of "Find logged!", so it gets the
// same short entrance: the pin grows in from 90% (250ms), then the code
// card rises 4px (200ms, from 100ms), done by about 300ms. With reduced
// motion they only fade.
function CacheHidden({ cache, onHideAnother }) {
  useEffect(() => {
    document.getElementById(HEADING_ID)?.focus()
  }, [])

  return (
    <div className="mx-auto flex w-full max-w-[28rem] flex-col items-center gap-5 text-center">
      <HiddenPin />
      <h1 id={HEADING_ID} tabIndex={-1} className="text-display text-text-primary outline-none">
        Cache hidden!
      </h1>
      <p className="text-body text-text-secondary">
        “<span className="wrap-break-word text-text-primary">{cache.title}</span>” is now on the map. Print the slip
        and put it inside the container.
      </p>
      <div className={`flex w-full flex-col items-center gap-1.5 rounded-2xl bg-bg-subtle p-5 delay-100 ${RISE_IN}`}>
        <p className="text-label text-text-secondary">Secret code</p>
        <p className="font-mono text-[2rem]/[2.75rem] font-bold tracking-[4px] text-text-primary">{cache.secretCode}</p>
      </div>
      <div className="flex w-full flex-col gap-3">
        {/* Prints just the slip (see Slip below). */}
        <Button fullWidth onClick={() => window.print()}>
          Print a slip
        </Button>
        <Button to={`/caches/${cache.cacheId}`} variant="secondary" fullWidth>
          View your cache
        </Button>
      </div>
      <button type="button" onClick={onHideAnother} className={TEXT_LINK}>
        Hide another cache
      </button>
    </div>
  )
}

// The printed slip: only the cache's name and its code, inside a dashed
// cut line, in black on white. It's hidden on screen and is the only thing
// on the page when printing (everything else is print:hidden).
function Slip({ cache }) {
  return (
    <div className="hidden print:flex print:justify-center print:pt-8">
      <div className="flex w-[3.5in] flex-col items-center gap-2 border-2 border-dashed border-black p-6 text-center text-black">
        <p className="font-display text-[16pt] font-bold leading-tight">{cache.title}</p>
        <p className="font-sans text-[9pt] font-bold uppercase tracking-[2px]">Secret code</p>
        <p className="font-mono text-[28pt] font-bold tracking-[6px]">{cache.secretCode}</p>
      </div>
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
  const navigate = useNavigate()
  const { userId } = useHideCache()
  // Starts from the draft kept for this tab, if any (with a new code only
  // if it had none).
  const [form, setForm] = useState(() => {
    const draft = readDraft()
    return draft ? { ...draft, secretCode: draft.secretCode ?? generateSecretCode() } : emptyForm()
  })
  const [problems, setProblems] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // After saving: { cacheId, secretCode, title }.
  const [hidden, setHidden] = useState(null)
  // Set when the login ran out mid-form.
  const [needsLogin, setNeedsLogin] = useState(false)
  const firstRender = useRef(true)
  const loginLink = `/login?next=${encodeURIComponent('/caches/new')}`

  // Signed out when the page opens: log in first, then come back here.
  useEffect(() => {
    if (userId === null) navigate(loginLink, { replace: true })
  }, [userId, loginLink, navigate])

  // Keep the form for this tab as they go (not before they've touched it).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (!hidden) saveDraft(form)
  }, [form, hidden])

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    if (problems[field]) setProblems((current) => ({ ...current, [field]: '' }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    setFormError('')
    const found = checkCacheForm(form)
    setProblems(found)
    // Move to the first problem, in the order the form shows them.
    const first = ['position', 'title', 'difficulty'].find((field) => found[field])
    if (first) {
      const target = { position: 'where-heading', title: 'cache-title', difficulty: 'difficulty-1' }[first]
      requestAnimationFrame(() => document.getElementById(target)?.focus())
      return
    }
    setSubmitting(true)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS)
    try {
      const saved = await createCache(supabase, form, controller.signal)
      clearDraft()
      setHidden({ ...saved, title: form.title.trim() })
      window.scrollTo({ top: 0 })
    } catch (error) {
      const { kind, message } = describeCreateError(error)
      if (kind === 'signed-out') setNeedsLogin(true)
      else setFormError(message)
    } finally {
      clearTimeout(timer)
      setSubmitting(false)
    }
  }

  function hideAnother() {
    clearDraft()
    setForm(emptyForm())
    setProblems({})
    setHidden(null)
    window.scrollTo({ top: 0 })
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
  } else if (needsLogin) {
    title = 'Log in again'
    content = (
      <div className="flex max-w-[28rem] flex-col gap-4">
        <h1 id={HEADING_ID} tabIndex={-1} className="text-title text-text-primary outline-none lg:text-display">
          Log in again to hide your cache
        </h1>
        <p className="text-body text-text-primary">
          Your login ran out. Everything you filled in is kept, so it’ll be here when you come back.
        </p>
        <Button to={loginLink} fullWidth className="lg:w-fit">
          Log in
        </Button>
      </div>
    )
  } else if (userId) {
    content = (
      <>
        <form id={FORM_ID} noValidate onSubmit={handleSubmit} className="flex flex-col gap-7">
          <div className="flex flex-col gap-3">
            <h1 id={HEADING_ID} tabIndex={-1} className="text-title text-text-primary outline-none lg:text-section">
              Hide a cache
            </h1>
            <p className="text-small text-text-secondary lg:text-body">
              Fill in the details, then put the code inside your container.
            </p>
          </div>
          {/* Phones: "Where is it?" first (you're often standing at the spot).
              Desktop: the form on the left, "Where is it?" on the right. */}
          <div className="flex flex-col gap-7 lg:flex-row-reverse lg:items-start lg:gap-12">
            <div className="flex flex-col gap-7 lg:sticky lg:top-6 lg:w-[30rem] lg:shrink-0">
              <WhereSection
                position={form.position}
                onPosition={(value) => update('position', value)}
                locationName={form.locationName}
                onLocationName={(value) => update('locationName', value)}
                error={problems.position}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-7">
              <Section title="What is it?">
                <TextField
                  id="cache-title"
                  label="Cache name"
                  placeholder="e.g. Mint tin by the Snell steps"
                  maxLength={TITLE_MAX_LENGTH}
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
              </Section>
              <HintsSection hints={form.hints} onChange={(value) => update('hints', value)} />
              <SecretCodeSection code={form.secretCode} onNewCode={() => update('secretCode', generateSecretCode())} />
              {formError && (
                <p role="alert" className="text-small text-error">
                  {formError}{' '}
                  {/timeout|My caches/i.test(formError) && (
                    <Link to="/my-caches" className={`${TEXT_LINK} text-small`}>
                      Go to My caches
                    </Link>
                  )}
                </p>
              )}
              {/* Desktop: the buttons sit right under the form. */}
              <div className="hidden items-center gap-3 lg:flex">
                {submitButton()}
                <Button to="/map" variant="secondary">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </form>
        {/* Phones: "Hide this cache" is pinned to the bottom of the screen. */}
        <div className="sticky bottom-0 z-20 -mx-4 mt-auto border-t border-border-subtle bg-bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] contrast-more:border-border-input lg:hidden">
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
      {hidden && <Slip cache={hidden} />}
    </>
  )
}

export default AddCachePage
