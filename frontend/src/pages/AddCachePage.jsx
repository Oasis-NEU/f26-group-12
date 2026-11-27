import { Check, Copy, LocateFixed, Plus, RefreshCw, X } from 'lucide-react'
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
  DIFFICULTY_MEANINGS,
  HINT_MAX_LENGTH,
  LOCATION_MAX_LENGTH,
  MAX_HINTS,
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
// a secret code ("Use a different code" makes another, with an Undo).
// create_cache saves it all together. Then "Cache hidden!" shows the code
// once more, with "Print a slip" (a page with the cache's name, its code
// and a line telling finders what to do) and "Copy code" for phones.
//
// The form is kept for this tab as they type, and so is "Cache hidden!"
// after saving, so a reload or a dropped tab never loses the code or makes
// it look as if nothing saved. Signed-out visitors log in and come back.
// Enter moves to the next field rather than saving, so the keyboard's Go
// can't save half a cache.
//
// Phones (the base styles): one column, "Where is it?" first, with "Hide
// this cache" in a bar at the bottom of the screen. Desktop (lg:): the
// form on the left and "Where is it?" on the right, with "Hide this cache"
// and "Cancel" under the form.

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const FORM_ID = 'hide-cache-form'
const HEADING_ID = 'hide-cache-heading'
const LOCATION_BUTTON_ID = 'use-my-location'
// GPS readings rougher than this get a warning (metres).
const ROUGH_ACCURACY_M = 30
const TEXT_LINK = `-my-1 w-fit cursor-pointer rounded-sm py-1 text-label text-text-primary underline underline-offset-4 hover:decoration-2 ${FOCUS_RING}`
// Something that just appeared fades in and rises 4px (200ms, the shared
// ease-out), like a hint being revealed; with reduced motion it only
// fades. starting: is the style it animates from (CSS @starting-style).
const RISE_IN =
  'transition-[opacity,translate] duration-200 ease-out starting:translate-y-1 starting:opacity-0 motion-reduce:starting:translate-y-0'
// A message that just appeared fades in (150ms).
const FADE_IN = 'transition-opacity duration-150 ease-out starting:opacity-0'
const FIELD_BOX = `w-full rounded-lg border border-border-input bg-bg-surface px-4 text-body text-text-primary placeholder:text-text-secondary ${FOCUS_RING}`

// "K7MQ2X" -> "K 7 M Q 2 X", so screen readers read a code letter by
// letter instead of trying to say it as a word.
function spelled(code) {
  return code.split('').join(' ')
}

// A part of the form ("Where is it?", "What is it?"...), labelled by its heading.
function Section({ title, children }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="text-heading text-text-primary">
        {title}
      </h2>
      {children}
    </section>
  )
}

// An error or help line under a field, with the "!" icon for errors (as
// in TextField). A new error fades in.
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
        placeholder="e.g. A small mint tin with a sticker on the lid."
        maxLength={DESCRIPTION_MAX_LENGTH}
        rows={3}
        aria-describedby={`${id}-help`}
        className={`min-h-24 resize-y py-3 ${FIELD_BOX}`}
      />
      <p id={`${id}-help`} className="text-small text-text-secondary">
        What to look for, not where it is: its size and what it looks like.
      </p>
    </div>
  )
}

// Difficulty 1-5: five big options, one picked at a time (radio buttons,
// so arrow keys move between them). The picked one is the Inverse fill,
// bars beside the label show it the way difficulty always appears, and the
// line under the options says what it means. (The legend has to be the
// fieldset's first child to name the group, so it's for screen readers;
// the visible row repeats it with the bars.)
function DifficultyPicker({ value, onChange, error }) {
  const messageId = useId()
  return (
    <fieldset aria-describedby={messageId} aria-required="true" className="flex flex-col gap-2">
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
            // pressed, like a Button, so a tap feels heard. With an error,
            // the outline turns red and is drawn 2px, like a field's.
            className={`flex h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border text-body-strong active:scale-97 motion-safe:transition-[background-color,border-color,color,scale] motion-safe:duration-150 motion-safe:ease-out has-focus-visible:ring-2 has-focus-visible:ring-focus has-focus-visible:ring-offset-2 ${
              value === level
                ? 'border-bg-inverse bg-bg-inverse text-text-on-accent'
                : `bg-bg-surface text-text-primary hover:bg-bg-subtle ${
                    error ? 'border-error inset-ring-1 inset-ring-error' : 'border-border-strong'
                  }`
            }`}
          >
            <input
              id={level === 1 ? 'difficulty-1' : undefined}
              type="radio"
              name="difficulty"
              value={level}
              checked={value === level}
              onChange={() => onChange(level)}
              aria-invalid={error ? true : undefined}
              className="sr-only"
            />
            {level}
            {/* Each option's full name for screen readers: "1, easy to spot". */}
            <span className="sr-only">, {DIFFICULTY_MEANINGS[level].toLowerCase()}</span>
          </label>
        ))}
      </div>
      <FieldMessage
        id={messageId}
        error={error}
        help={value ? `Difficulty ${value}: ${DIFFICULTY_MEANINGS[value]}` : '1 = easy to spot, 5 = a real challenge'}
      />
    </fieldset>
  )
}

// "Where is it?": the map to place the pin (when Google Maps is set up),
// and "Use my current location", which works without a map and is quickest
// when you're standing at the spot. The browser asks first; the location
// only sets the pin (saved as the cache's spot), and says how accurate it
// is, warning when it's rough.
function WhereSection({ position, onPosition, locationName, onLocationName, error }) {
  const [locating, setLocating] = useState('idle')
  // How accurate the last location was, in metres (not saved anywhere).
  const [accuracy, setAccuracy] = useState(null)
  const messageId = useId()

  function useMyLocation() {
    if (locating === 'locating') return
    if (!('geolocation' in navigator)) {
      setLocating('unavailable')
      return
    }
    setLocating('locating')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onPosition({ lat: coords.latitude, lng: coords.longitude })
        setAccuracy(Number.isFinite(coords.accuracy) ? Math.round(coords.accuracy) : null)
        setLocating('idle')
      },
      (failure) => setLocating(failure.code === failure.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  let help = 'Sets the pin to where you’re standing.'
  if (locating === 'locating') help = 'Finding where you are…'
  else if (locating === 'denied') {
    help = 'Location is off for this site. Allow it in your browser’s settings, or place the pin on the map.'
  } else if (locating === 'unavailable') {
    help = 'Your location isn’t available right now. Try again outside, or place the pin on the map.'
  } else if (accuracy !== null && position) {
    help =
      accuracy > ROUGH_ACCURACY_M
        ? `That’s only accurate to about ${accuracy} m. Step into the open, wait a moment, then try again.`
        : `Pin set to where you’re standing (accurate to about ${accuracy} m).`
  }

  return (
    <Section title="Where is it?">
      {GOOGLE_MAPS_API_KEY ? (
        <LocationPicker
          position={position}
          onChange={(value) => {
            onPosition(value)
            setAccuracy(null)
          }}
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
            {position ? 'Use your location again to move it.' : 'Stand at the cache and use your current location.'}
          </p>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Button
          id={LOCATION_BUTTON_ID}
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
          <FieldMessage id={messageId} error={error} help={help} />
        </div>
      </div>
      <TextField
        label="Location name (optional)"
        placeholder="e.g. near Snell Library"
        help="The general area finders head for."
        maxLength={LOCATION_MAX_LENGTH}
        enterKeyHint="next"
        value={locationName}
        onChange={(event) => onLocationName(event.target.value)}
      />
    </Section>
  )
}

// Hints: up to 3, in order. Each one after the first can be removed. Each
// field gets a stable key, so removing hint 2 removes hint 2's field, and
// only fields added now rise in (ones restored from the draft just appear).
function HintsSection({ hints, onChange }) {
  const listId = useId()
  const nextKey = useRef(hints.length)
  const [keys, setKeys] = useState(() => hints.map((_, index) => index))
  const [added, setAdded] = useState(() => new Set())

  function setHint(index, text) {
    onChange(hints.map((hint, i) => (i === index ? text : hint)))
  }

  function addHint() {
    const key = nextKey.current++
    setKeys((current) => [...current, key])
    setAdded((current) => new Set(current).add(key))
    onChange([...hints, ''])
    // Move to the new field, so they can type straight away.
    requestAnimationFrame(() => document.getElementById(`${listId}-${hints.length}`)?.focus())
  }

  function removeHint(index) {
    setKeys((current) => current.filter((_, i) => i !== index))
    onChange(hints.filter((_, i) => i !== index))
    requestAnimationFrame(() => document.getElementById(`${listId}-${Math.max(0, index - 1)}`)?.focus())
  }

  return (
    <Section title="Hints (optional)">
      <p className="-mt-2 text-small text-text-secondary">
        Up to 3. Start vague, and make each one give away a little more of where it is.
      </p>
      {hints.map((hint, index) => (
        <TextField
          key={keys[index]}
          id={`${listId}-${index}`}
          className={added.has(keys[index]) ? RISE_IN : ''}
          label={`Hint ${index + 1}`}
          placeholder={index === 0 ? 'e.g. Sit on the steps and look down' : undefined}
          maxLength={HINT_MAX_LENGTH}
          enterKeyHint="next"
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
      {/* The next hint's empty slot: dashed, like other "not there yet"
          spots, and sitting where the new field will appear. */}
      {hints.length < MAX_HINTS && (
        <button
          type="button"
          onClick={addHint}
          className={`flex h-12 w-full cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-border-input px-4 text-label text-text-secondary hover:border-text-secondary hover:text-text-primary active:scale-99 contrast-more:border-text-secondary motion-safe:transition-[border-color,color,scale] motion-safe:duration-150 motion-safe:ease-out ${FOCUS_RING}`}
        >
          <Plus aria-hidden="true" size={18} />
          Add hint {hints.length + 1}
        </button>
      )}
    </Section>
  )
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
    <Section title="Secret code">
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
        {/* Prints just the slip (see Slip below). */}
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
      <button type="button" onClick={onHideAnother} className={TEXT_LINK}>
        Hide another cache
      </button>
    </div>
  )
}

// The printed slip: the cache's name, its code and one line telling
// whoever opens the container what to do, inside a dashed cut line, black
// on white. It's hidden on screen and is the only thing on the page when
// printing (everything else is print:hidden). No link or QR code until the
// site is deployed.
function Slip({ cache }) {
  return (
    <div className="hidden print:flex print:justify-center print:pt-8">
      <div className="flex w-[3.5in] flex-col items-center gap-2 border-2 border-dashed border-black p-6 text-center text-black">
        <p className="wrap-break-word font-display text-[16pt] font-bold leading-tight">{cache.title}</p>
        <p className="font-sans text-[9pt] font-bold uppercase tracking-[2px]">Secret code</p>
        <p className="font-mono text-[28pt] font-bold tracking-[6px]">{cache.secretCode}</p>
        <p className="font-sans text-[9pt] leading-snug">
          This is a HuskyCache geocache. Log your find on HuskyCache with this code, then put the cache back where you
          found it.
        </p>
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

// Enter in a one-line field moves to the next field instead of saving the
// whole form (the keyboard's Go would otherwise save half a cache). Only
// the "Hide this cache" button saves.
function moveToNextField(event) {
  if (event.key !== 'Enter' || event.target.tagName !== 'INPUT' || event.target.type === 'radio') return
  event.preventDefault()
  const fields = [...event.currentTarget.querySelectorAll('input:not([type="radio"]), textarea')]
  fields[fields.indexOf(event.target) + 1]?.focus()
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
      const target = { position: LOCATION_BUTTON_ID, title: 'cache-title', difficulty: 'difficulty-1' }[first]
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
              <Section title="What is it?">
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
              </Section>
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
      {hidden && <Slip cache={hidden} />}
    </>
  )
}

export default AddCachePage
