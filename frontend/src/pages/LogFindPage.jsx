import { useEffect, useId, useState } from 'react'
import { Link, useParams } from 'react-router'
import chevronLeft from '../assets/figma/chevron-left.svg'
import Button from '../components/Button.jsx'
import { FOCUS_RING } from '../components/focusRing.js'
import { useLoginDialog } from '../components/login/loginDialogContext.js'
import LoginRequired from '../components/login/LoginRequired.jsx'
import MapPin from '../components/MapPin.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import StarRating from '../components/StarRating.jsx'
import {
  LOG_TIMEOUT_MS,
  NOTE_MAX_LENGTH,
  checkSecretCode,
  clearDraft,
  describeLogFindError,
  logFind,
  pointsText,
  readDraft,
  saveDraft,
  saveFindNotes,
} from '../lib/logFind.js'
import { supabase } from '../lib/supabaseClient.js'
import { useLogFind } from '../lib/useLogFind.js'
import { contourRing } from './cacheDetail/contours.js'
import { formatFoundDate } from './cacheDetailData.js'

// Log a find: /caches/:cacheId/log. From the Figma section "Log find ·
// /caches/:cacheId/log" and its notes.
//
// At the cache, the page asks for one thing: the secret code from the slip.
// log_find checks it in the database; a wrong code shows under the code box
// (and keeps what they typed), a right one shows "Find logged!": the
// cache's found pin, the points earned, and then, optionally, a rating and
// a journal note to add to the find. Signed-out visitors get the login
// dialog over the page, and the form appears once they've logged in. If
// their login runs out mid-form, the code they typed is kept for this tab.
//
// Phones (the base styles): the form fills the page and "Log find" sits in
// a bar along the bottom of the screen. Desktop (lg:): the same form in a
// 448px column, with "Log find" and "Cancel" right under it.

const FORM_ID = 'log-find-form'
const CODE_ID = 'secret-code'
const HEADING_ID = 'log-find-heading'
// The 448px column everything sits in (the phone's bottom bar spans the
// whole screen instead).
const COLUMN = 'mx-auto w-full max-w-[28rem]'
const TEXT_LINK = `-my-1 cursor-pointer rounded-sm py-1 font-bold text-text-primary underline underline-offset-4 hover:decoration-2 ${FOCUS_RING}`
// Show "N characters left" once the note is this close to its limit.
const NOTE_WARN_AT = 50

// "← Back to cache". The padding makes the tap area 44px tall; the matching
// negative margins keep the link where it was in the layout.
function BackToCache({ cacheId }) {
  return (
    <Link
      to={`/caches/${cacheId}`}
      className={`-mx-2 -my-3 flex w-fit items-center gap-2 rounded-lg px-2 py-3 text-label text-text-secondary hover:text-text-primary ${FOCUS_RING}`}
    >
      {/* Figma's chevron is 8 x 14 and overflows its 6 x 12 box a little. */}
      <span className="relative h-3 w-1.5 shrink-0" aria-hidden="true">
        <img src={chevronLeft} width={8} height={14} alt="" className="absolute inset-[-8.33%_-16.67%] block max-w-none" />
      </span>
      Back to cache
    </Link>
  )
}

// The page's heading. It can take focus (tabIndex -1), so when the page
// changes to a new state, keyboard and screen-reader users land on it.
function Heading({ className = 'text-title text-text-primary lg:text-display', describedBy, children }) {
  return (
    <h1 id={HEADING_ID} tabIndex={-1} aria-describedby={describedBy} className={`outline-none ${className}`}>
      {children}
    </h1>
  )
}

// A state where the find can't be logged here (taken down, your own cache,
// already found, couldn't load...): a heading, a sentence and where to go.
function StateScreen({ heading, children, actions }) {
  return (
    <div className={`${COLUMN} flex flex-col gap-4`}>
      <Heading>{heading}</Heading>
      <p className="text-body text-text-primary">{children}</p>
      {actions && <div className="flex flex-col gap-3 lg:flex-row">{actions}</div>}
    </div>
  )
}

// The secret code box: 56px tall, with the code in JetBrains Mono (the
// one face DESIGN.md keeps for secret codes). Errors appear under it in
// Error with the "!" icon and outline the box in red, like TextField; a new
// error fades in (150ms) and the outline eases to red.
function SecretCodeField({ value, onChange, error }) {
  const messageId = `${CODE_ID}-message`
  return (
    <div className="flex w-full flex-col gap-2">
      <label htmlFor={CODE_ID} className="text-label text-text-primary">
        Secret code
      </label>
      <input
        id={CODE_ID}
        name="secret-code"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        maxLength={12}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        className={`h-14 w-full rounded-lg border border-border-input bg-bg-surface px-4 text-code uppercase text-text-primary motion-safe:transition-[border-color,box-shadow] motion-safe:duration-150 motion-safe:ease-out ${FOCUS_RING} ${
          error ? 'border-error inset-ring-1 inset-ring-error' : ''
        }`}
      />
      <div id={messageId} className="flex items-start gap-2">
        {error && (
          <span
            key={error}
            aria-hidden="true"
            className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-error font-display text-[12px]/[14px] font-bold text-text-on-accent transition-opacity duration-150 ease-out starting:opacity-0"
          >
            !
          </span>
        )}
        {/* Keyed by its text, so each new error gets the fade. */}
        <p
          key={error || 'help'}
          className={`text-small ${error ? 'text-error transition-opacity duration-150 ease-out starting:opacity-0' : 'text-text-secondary'}`}
        >
          {error || '6 letters and numbers, written on the slip inside the cache.'}
        </p>
      </div>
    </div>
  )
}

// The optional journal note: a 112px box, same look as a text field. Near
// its limit it says how many characters are left.
function NoteField({ value, onChange }) {
  const id = useId()
  const left = NOTE_MAX_LENGTH - value.length
  return (
    <div className="flex w-full flex-col gap-2">
      <label htmlFor={id} className="text-label text-text-primary">
        Journal note (optional)
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="What was it like?"
        maxLength={NOTE_MAX_LENGTH}
        rows={4}
        aria-describedby={`${id}-left`}
        className={`min-h-28 w-full resize-y rounded-lg border border-border-input bg-bg-surface px-4 py-3 text-body text-text-primary placeholder:text-text-secondary ${FOCUS_RING}`}
      />
      {left <= NOTE_WARN_AT && (
        <p className="text-small text-text-secondary">{`${left} ${left === 1 ? 'character' : 'characters'} left`}</p>
      )}
      {/* Always there (hidden), so screen readers hear the count once it shows. */}
      <p id={`${id}-left`} className="sr-only" aria-live="polite">
        {left <= NOTE_WARN_AT ? `${left} ${left === 1 ? 'character' : 'characters'} left` : ''}
      </p>
    </div>
  )
}

// Rings for the success screen's pin, worked out once: the cache page's
// contour backdrop, so the find looks like that spot on the map turning to
// found. The SVG is centred on the pin, so (0, 0) is the pin.
const SUCCESS_RINGS = Array.from({ length: 12 }, (_, i) => contourRing(0, 0, 34 + i * 30, 2.2 + i * 0.13))

// The found pin with contour rings around it, like the top of a hill on a
// map. The rings are decoration: they don't animate (DESIGN.md), fade out
// with distance, stop just below the pin (so no line runs behind the
// heading and text under it), and disappear with Increase Contrast. The pin is the cache page's MapPin, shown twice
// its map size (56px).
function FoundPin() {
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
      {/* The one celebration (see FindLogged): the pin grows in from 90%. */}
      <span className="block transition-[opacity,scale] duration-250 ease-out starting:scale-90 starting:opacity-0 motion-reduce:starting:scale-100">
        <span className="block scale-200">
          <MapPin found />
        </span>
      </span>
    </span>
  )
}

// After the code is accepted: an optional rating and journal note, saved
// onto the find that was just logged. Asked here rather than at the cache,
// so the form there is just the code (and the keyboard's Go can't send
// before a rating). The Save button only appears once there's something
// to save.
function JournalNotes({ cacheId, userId }) {
  const [rating, setRating] = useState(0)
  const [note, setNote] = useState('')
  // 'idle' | 'saving' | 'saved' | 'error'
  const [status, setStatus] = useState('idle')
  const hasSomething = rating > 0 || note.trim() !== ''

  function edited() {
    if (status === 'saved' || status === 'error') setStatus('idle')
  }

  async function handleSave(event) {
    event.preventDefault()
    if (status === 'saving' || !hasSomething) return
    setStatus('saving')
    try {
      await saveFindNotes(supabase, { cacheId, userId, rating, note })
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  return (
    <form
      noValidate
      onSubmit={handleSave}
      aria-labelledby="journal-notes-title"
      className="flex w-full flex-col gap-4 rounded-2xl border border-border-subtle bg-bg-surface p-4 text-left contrast-more:border-border-input"
    >
      <div className="flex flex-col gap-1">
        <h2 id="journal-notes-title" className="text-heading text-text-primary">
          Add it to your journal
        </h2>
        <p className="text-small text-text-secondary">Optional. Rate the cache and say how it went.</p>
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-label text-text-primary">Your rating</p>
          {rating > 0 && (
            <button
              type="button"
              onClick={() => {
                setRating(0)
                edited()
              }}
              className={`text-small ${TEXT_LINK}`}
            >
              Clear
            </button>
          )}
        </div>
        <StarRating
          value={rating}
          onChange={(value) => {
            setRating(value)
            edited()
          }}
          label="Your rating"
        />
      </div>
      <NoteField
        value={note}
        onChange={(value) => {
          setNote(value)
          edited()
        }}
      />
      {hasSomething && (
        <Button
          type="submit"
          variant="secondary"
          fullWidth
          aria-disabled={status === 'saving' || undefined}
          className="aria-disabled:cursor-wait"
        >
          {status === 'saving' ? 'Adding…' : 'Add to journal'}
        </Button>
      )}
      {status === 'saved' && <p className="text-small text-text-secondary">Added to your journal.</p>}
      {/* Always there (hidden), so screen readers hear "Added to your journal." when it happens. */}
      <p className="sr-only" aria-live="polite">
        {status === 'saved' ? 'Added to your journal.' : ''}
      </p>
      {status === 'error' && (
        <p role="alert" className="text-small text-error">
          That didn’t save. Check your connection and try again.
        </p>
      )}
    </form>
  )
}

// "Find logged!": the cache's pin turning to found, the place, the date,
// the points earned, the optional journal notes, and where to go next.
// The place leads; the points come second, since points "add motivation
// but are not the core" (PRODUCT.md). "Back to the map" is the main action:
// the first principle is getting people outside, to the next cache.
//
// This is the one celebration DESIGN.md allows (the moment the find
// happens), kept inside its motion rules: the found pin grows in from 90%
// (250ms), then the points and the journal box rise 4px (200ms, starting
// 100ms in), all done by about 300ms, on the shared ease-out. starting: is
// the style each part animates from (CSS @starting-style). With reduced
// motion on, they only fade in.
const RISE_IN =
  'transition-[opacity,translate] delay-100 duration-200 ease-out starting:translate-y-1 starting:opacity-0 motion-reduce:starting:translate-y-0'

function FindLogged({ cache, cacheId, userId, totalPoints }) {
  useEffect(() => {
    document.getElementById(HEADING_ID)?.focus()
  }, [])
  const earned = Math.min(5, Math.max(1, Math.round(Number(cache.difficulty)) || 1))
  // log_find doesn't send back the find's time; it was just now.
  const [foundOn] = useState(() => formatFoundDate(new Date().toISOString()))

  return (
    <div className={`${COLUMN} flex flex-col items-center gap-4 text-center`}>
      <FoundPin />
      {/* Focus lands here; screen readers then also hear the place and points. */}
      <Heading className="text-display text-text-primary" describedBy="find-logged-place find-logged-points">
        Find logged!
      </Heading>
      <div id="find-logged-place" className="flex flex-col items-center gap-1">
        <p className="wrap-break-word text-title text-text-primary">{cache.title}</p>
        <p className="text-label text-found">Found by you on {foundOn}</p>
      </div>
      {/* Star Gold Soft: the background DESIGN.md keeps for points earned. */}
      <div
        id="find-logged-points"
        className={`flex w-full flex-col items-center gap-1 rounded-2xl bg-highlight-soft p-5 ${RISE_IN}`}
      >
        <p className="text-heading text-text-primary">{pointsText(earned)}</p>
        {/* The total arrives a moment later; its line keeps its space, so
            nothing below jumps. */}
        <p className="min-h-5 text-small text-text-secondary">
          {totalPoints !== null && `You now have ${totalPoints === 1 ? '1 point' : `${totalPoints} points`}.`}
        </p>
      </div>
      <div className={`w-full ${RISE_IN}`}>
        <JournalNotes cacheId={cacheId} userId={userId} />
      </div>
      <div className="flex w-full flex-col gap-3">
        <Button to="/map" fullWidth>
          Back to the map
        </Button>
        <Button to="/journal" variant="secondary" fullWidth>
          See your journal
        </Button>
      </div>
    </div>
  )
}

// The form at the cache: just the secret code. onResult() after the find is
// saved, or onResult({ kind }) when log_find says it can't be logged (see
// describeLogFindError).
function LogFindForm({ cache, cacheId, onResult }) {
  // Starts from the code they typed before their login ran out, if any.
  const [code, setCode] = useState(() => readDraft(cacheId)?.code ?? '')
  const [codeError, setCodeError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // A hidden live region, for a code error when the code box already has
  // focus (focusing it again wouldn't make screen readers say anything).
  const [announcement, setAnnouncement] = useState('')

  // Phones: leave room for the bottom bar when the browser scrolls a field
  // into view (e.g. the keyboard opening), so it never hides behind "Log find".
  useEffect(() => {
    const root = document.documentElement
    const before = root.style.scrollPaddingBottom
    root.style.scrollPaddingBottom = '6rem'
    return () => {
      root.style.scrollPaddingBottom = before
    }
  }, [])

  function pointAtCode(message) {
    setCodeError(message)
    if (document.activeElement?.id === CODE_ID) {
      setAnnouncement('')
      requestAnimationFrame(() => setAnnouncement(message))
    } else {
      requestAnimationFrame(() => document.getElementById(CODE_ID)?.focus())
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    setFormError('')
    const problem = checkSecretCode(code)
    if (problem) {
      pointAtCode(problem)
      return
    }
    setSubmitting(true)
    // Give up after LOG_TIMEOUT_MS, so a weak signal can't leave the button
    // stuck on "Logging find…".
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), LOG_TIMEOUT_MS)
    try {
      await logFind(supabase, { cacheId, code, rating: 0, note: '', signal: controller.signal })
      clearDraft(cacheId)
      onResult({})
    } catch (error) {
      setSubmitting(false)
      const { kind, message } = describeLogFindError(error)
      if (kind === 'wrong-code') {
        // Stay on this page, under the code box, keeping what they typed.
        pointAtCode(message)
      } else if (kind === 'signed-out') {
        // Keep the code for when they come back from logging in.
        saveDraft(cacheId, { code })
        onResult({ kind })
      } else if (kind === 'already-found' || kind === 'hider' || kind === 'inactive') {
        clearDraft(cacheId)
        onResult({ kind })
      } else {
        setFormError(message)
      }
    } finally {
      clearTimeout(timer)
    }
  }

  // The submit button. While working it stays red and says so; aria-disabled
  // marks it busy and the form ignores more presses (disabled would grey it
  // out and drop keyboard focus).
  function submitButton(className = '') {
    return (
      <Button
        type="submit"
        form={FORM_ID}
        aria-disabled={submitting || undefined}
        className={`aria-disabled:cursor-wait ${className}`}
      >
        {submitting ? 'Logging find…' : 'Log find'}
      </Button>
    )
  }

  return (
    <>
      <form id={FORM_ID} noValidate onSubmit={handleSubmit} className={`${COLUMN} flex flex-col gap-5`}>
        <div className="flex flex-col gap-1">
          <Heading>Log your find</Heading>
          <p className="wrap-break-word text-body text-text-secondary">{cache.title}</p>
        </div>
        <SecretCodeField
          value={code}
          onChange={(value) => {
            setCode(value)
            setCodeError('')
          }}
          error={codeError}
        />
        {formError && (
          <p role="alert" className="text-small text-error">
            {formError}
          </p>
        )}
        {/* Desktop: the buttons sit right under the form. */}
        <div className="hidden items-center gap-3 lg:flex">
          {submitButton()}
          <Button to={`/caches/${cacheId}`} variant="secondary">
            Cancel
          </Button>
        </div>
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </form>
      {/* Phones: "Log find" is pinned to the bottom of the screen, in reach
          of a thumb, across its full width. It submits the form above
          through form=. */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-auto border-t border-border-subtle bg-bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] contrast-more:border-border-input lg:hidden">
        <div className={COLUMN}>{submitButton('w-full')}</div>
      </div>
    </>
  )
}

function LogFindPage() {
  const { cacheId } = useParams()
  const detail = useLogFind(cacheId)
  const { openLogin } = useLoginDialog()
  // What happened when they pressed "Log find": { kind: 'logged' }, or the
  // reason log_find gave ({ kind: 'already-found' | 'hider' | 'inactive' |
  // 'signed-out' }). null before then.
  const [outcome, setOutcome] = useState(null)
  const [totalPoints, setTotalPoints] = useState(null)

  // Signed out: the login dialog opens over the page (see below), and the
  // form appears once they've logged in (useLogFind notices by itself).
  const signedOut = detail.userId === null

  // When the page changes state after "Log find", move focus to its heading.
  useEffect(() => {
    if (outcome) document.getElementById(HEADING_ID)?.focus()
  }, [outcome])

  function handleResult(result) {
    // "Already logged" right after pressing the button, with no earlier find
    // when the page opened, means the first try did save and only its answer
    // got lost (e.g. a dropped signal). That's a success.
    const lostAnswer = result.kind === 'already-found' && !detail.existingFind
    if (!result.kind || lostAnswer) {
      setOutcome({ kind: 'logged' })
      detail.loadPoints().then(setTotalPoints)
      return
    }
    setOutcome(result)
  }

  const cache = detail.cache
  const kind = outcome?.kind
  let title = 'Log your find'
  let content
  if (signedOut) {
    title = 'Log in to log your find'
    content = (
      <div className={COLUMN}>
        <LoginRequired
          heading="Log in to log your find"
          headingId={HEADING_ID}
          task="log your find"
          onLoggedIn={() => setOutcome(null)}
        >
          Your finds and points are saved to your account. Log in, then enter the code from the slip.
        </LoginRequired>
      </div>
    )
  } else if (detail.loading) {
    content = (
      <div className={COLUMN}>
        {/* Screen readers still get a page heading while it loads. */}
        <h1 className="sr-only">Log your find</h1>
        <p role="status" className="text-body text-text-secondary">
          Loading cache…
        </p>
      </div>
    )
  } else if (detail.error) {
    title = 'Couldn’t load this cache'
    content = (
      <StateScreen
        heading="We couldn’t load this cache"
        actions={
          <Button onClick={detail.retry} fullWidth className="lg:w-fit">
            Try again
          </Button>
        }
      >
        Check your connection, then try again.
      </StateScreen>
    )
  } else if (kind === 'logged') {
    title = 'Find logged!'
    content = (
      <FindLogged cache={cache} cacheId={cacheId} userId={detail.userId} totalPoints={totalPoints} />
    )
  } else if (kind === 'signed-out') {
    title = 'Log in again'
    content = (
      <StateScreen
        heading="Log in again to save your find"
        actions={
          // Opens the login dialog; once they're back in, the form returns
          // with the code they typed.
          <Button
            onClick={() =>
              openLogin({ task: 'save your find', expired: true, onLoggedIn: () => setOutcome(null) })
            }
            aria-haspopup="dialog"
            fullWidth
            className="lg:w-fit"
          >
            Log in
          </Button>
        }
      >
        Your login ran out. We kept the code you typed, so it’ll be here once you’ve logged in.
      </StateScreen>
    )
  } else if (!cache) {
    title = 'Cache not found'
    content = (
      <StateScreen
        heading="We couldn’t find that cache"
        actions={
          <Button to="/map" variant="secondary" fullWidth className="lg:w-fit">
            Back to the map
          </Button>
        }
      >
        It may have been taken down, or the link is wrong.
      </StateScreen>
    )
  } else if (detail.isHider || kind === 'hider') {
    // Hiders know the code, so logging their own cache wouldn't prove anything.
    const takenDown = !cache.is_active || kind === 'inactive'
    title = takenDown ? 'You took this cache down' : 'Your own cache'
    content = (
      <StateScreen
        heading={takenDown ? 'You took this cache down' : 'This is your cache'}
        actions={
          <Button to={`/caches/${cacheId}`} variant="secondary" fullWidth className="lg:w-fit">
            Back to cache
          </Button>
        }
      >
        {takenDown ? 'So it can’t be logged as a find.' : 'You hid it, so you can’t log it as a find.'}
      </StateScreen>
    )
  } else if (!cache.is_active || kind === 'inactive') {
    title = 'Cache taken down'
    content = (
      <StateScreen
        heading="This cache was taken down"
        actions={
          <Button to="/map" variant="secondary" fullWidth className="lg:w-fit">
            Back to the map
          </Button>
        }
      >
        It can’t be logged anymore.
      </StateScreen>
    )
  } else if (detail.existingFind || kind === 'already-found') {
    title = 'Already found'
    content = (
      <StateScreen
        heading="You’ve already found this cache"
        actions={
          <>
            <Button to="/journal" fullWidth className="lg:w-fit">
              See your journal
            </Button>
            <Button to={`/caches/${cacheId}`} variant="secondary" fullWidth className="lg:w-fit">
              Back to cache
            </Button>
          </>
        }
      >
        {detail.existingFind
          ? `You logged it on ${formatFoundDate(detail.existingFind.created_at)}. Each cache counts once.`
          : 'Each cache counts once.'}
      </StateScreen>
    )
  } else {
    content = <LogFindForm cache={cache} cacheId={cacheId} onResult={handleResult} />
  }

  const showBack = kind !== 'logged'

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
        {/* Full width, so the phone's bottom bar can span the screen; each
            piece inside sits in the 448px COLUMN. The success screen starts
            lower, closer to the middle of the screen. */}
        <div
          className={`flex w-full flex-1 flex-col gap-5 overflow-clip px-4 lg:px-0 ${
            kind === 'logged' ? 'pb-8 pt-16 lg:pt-24' : 'pt-4 lg:pb-12 lg:pt-10'
          }`}
        >
          {showBack && (
            <div className={COLUMN}>
              <BackToCache cacheId={cacheId} />
            </div>
          )}
          {content}
        </div>
      </main>
    </div>
  )
}

export default LogFindPage
