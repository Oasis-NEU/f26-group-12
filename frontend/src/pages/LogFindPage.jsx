import { Check } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import chevronLeft from '../assets/figma/chevron-left.svg'
import Button from '../components/Button.jsx'
import { FOCUS_RING } from '../components/focusRing.js'
import SiteHeader from '../components/SiteHeader.jsx'
import StarRating from '../components/StarRating.jsx'
import {
  NOTE_MAX_LENGTH,
  checkSecretCode,
  describeLogFindError,
  logFind,
  pointsText,
} from '../lib/logFind.js'
import { supabase } from '../lib/supabaseClient.js'
import { useLogFind } from '../lib/useLogFind.js'
import { formatFoundDate } from './cacheDetailData.js'

// Log a find: /caches/:cacheId/log. From the Figma section "Log find ·
// /caches/:cacheId/log" and its notes.
//
// The finder types the secret code from the slip inside the cache, and can
// rate the cache and write a journal note. log_find checks the code in the
// database; a wrong code shows under the code box (and keeps what they
// typed), a right one shows "Find logged!" with the points they earned.
// Signed-out visitors are sent to log in, and come back here afterwards.
//
// Phones (the base styles): the form fills the page and "Log find" sits in
// a bar at the bottom of the screen. Desktop (lg:): the same form in a
// 448px column, with "Log find" and "Cancel" right under it.

const FORM_ID = 'log-find-form'
const CODE_ID = 'secret-code'
const TEXT_LINK = `-my-1 cursor-pointer rounded-sm py-1 font-bold text-text-primary underline underline-offset-4 hover:decoration-2 ${FOCUS_RING}`

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

// A message in a white box, for loading, errors and the "can't log this"
// states. Capped at a readable width, like the cache page's notices.
function Notice({ role = 'status', children }) {
  return (
    <div
      role={role}
      className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-bg-surface p-4 text-body text-text-secondary contrast-more:border-border-input"
    >
      {children}
    </div>
  )
}

// The secret code box: 56px tall, with the code in JetBrains Mono (the
// one face DESIGN.md keeps for secret codes). Errors appear under it in
// Error with the "!" icon, and outline the box in red, like TextField.
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
        placeholder="e.g. QDRMX4"
        autoComplete="off"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        maxLength={12}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        className={`h-14 w-full rounded-lg border border-border-input bg-bg-surface px-4 text-code uppercase text-text-primary placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-text-secondary ${FOCUS_RING} ${
          error ? 'border-error inset-ring-1 inset-ring-error' : ''
        }`}
      />
      <div id={messageId} className="flex items-start gap-2">
        {error && (
          <span
            aria-hidden="true"
            className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-error font-display text-[12px]/[14px] font-bold text-text-on-accent"
          >
            !
          </span>
        )}
        <p className={`text-small ${error ? 'text-error' : 'text-text-secondary'}`}>
          {error || 'It’s written on the slip inside the cache.'}
        </p>
      </div>
    </div>
  )
}

// The optional journal note: a 112px box, same look as a text field.
function NoteField({ value, onChange }) {
  const id = useId()
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
        className={`min-h-28 w-full resize-y rounded-lg border border-border-input bg-bg-surface px-4 py-3 text-body text-text-primary placeholder:text-text-secondary ${FOCUS_RING}`}
      />
    </div>
  )
}

// "Find logged!": the check, the cache, the points earned, and where to go
// next. Its heading takes focus when it appears, so screen readers say it.
function FindLogged({ cache, totalPoints }) {
  const headingRef = useRef(null)
  useEffect(() => {
    headingRef.current?.focus()
  }, [])
  const earned = Math.min(5, Math.max(1, Math.round(Number(cache.difficulty)) || 1))

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {/* Found Green, with a check: the system's mark for "found". */}
      <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-found text-text-on-accent">
        <Check size={32} strokeWidth={3} />
      </span>
      <h1 ref={headingRef} tabIndex={-1} className="text-display text-text-primary outline-none">
        Find logged!
      </h1>
      <p className="wrap-break-word text-body text-text-secondary">{cache.title}</p>
      {/* Star Gold Soft: the background DESIGN.md keeps for points earned. */}
      <div className="flex w-full flex-col items-center gap-1 rounded-2xl bg-highlight-soft p-5">
        <p className="text-display text-text-primary">{pointsText(earned)}</p>
        {totalPoints !== null && (
          <p className="text-small text-text-secondary">
            You now have {totalPoints === 1 ? '1 point' : `${totalPoints} points`}.
          </p>
        )}
      </div>
      <div className="flex w-full flex-col gap-3">
        <Button to="/journal" fullWidth>
          See your journal
        </Button>
        <Button to="/map" variant="secondary" fullWidth>
          Back to the map
        </Button>
      </div>
    </div>
  )
}

// onResult() after a find is saved, or onResult(kind) when log_find says it
// can't be logged (see describeLogFindError).
function LogFindForm({ cache, cacheId, onResult }) {
  const [code, setCode] = useState('')
  const [rating, setRating] = useState(0)
  const [note, setNote] = useState('')
  const [codeError, setCodeError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // A hidden live region, for a code error when the code box already has
  // focus (focusing it again wouldn't make screen readers say anything).
  const [announcement, setAnnouncement] = useState('')

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
    try {
      await logFind(supabase, { cacheId, code, rating, note })
      onResult()
    } catch (error) {
      setSubmitting(false)
      const { kind, message } = describeLogFindError(error)
      // A wrong code stays on this page, under the code box, keeping what
      // they typed. Anything that means they can't log it moves to that state.
      if (kind === 'wrong-code') pointAtCode(message)
      else if (kind === 'already-found' || kind === 'hider' || kind === 'inactive' || kind === 'signed-out') {
        onResult(kind)
      } else setFormError(message)
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
      <form id={FORM_ID} noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-title text-text-primary lg:text-display">Log your find</h1>
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
        <div className="h-px w-full bg-border-subtle contrast-more:bg-border-input" />
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-label text-text-primary">
              Rate this cache (optional)
            </p>
            {rating > 0 && (
              <button type="button" onClick={() => setRating(0)} className={`text-small ${TEXT_LINK}`}>
                Clear
              </button>
            )}
          </div>
          <StarRating value={rating} onChange={setRating} label="Rate this cache (optional)" />
        </div>
        <NoteField value={note} onChange={setNote} />
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
          of a thumb. It submits the form above through form=. */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-auto border-t border-border-subtle bg-bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] contrast-more:border-border-input lg:hidden">
        {submitButton('w-full')}
      </div>
    </>
  )
}

function LogFindPage() {
  const { cacheId } = useParams()
  const navigate = useNavigate()
  const detail = useLogFind(cacheId)
  // After a find is logged: 'logged', or the reason it can't be logged that
  // log_find gave ('already-found', 'hider', 'inactive', 'signed-out').
  const [outcome, setOutcome] = useState(null)
  const [totalPoints, setTotalPoints] = useState(null)

  // Signed out: log in first, then come back here (the login page follows
  // ?next=). replace, so "back" from the login page skips this page.
  const signedOut = detail.userId === null || outcome === 'signed-out'
  useEffect(() => {
    if (signedOut) navigate(`/login?next=${encodeURIComponent(`/caches/${cacheId}/log`)}`, { replace: true })
  }, [signedOut, cacheId, navigate])

  function handleResult(reason) {
    if (reason) {
      setOutcome(reason)
      return
    }
    setOutcome('logged')
    detail.loadPoints().then(setTotalPoints)
  }

  const cache = detail.cache
  let title = 'Log your find'
  let content
  if (signedOut) {
    content = null
  } else if (detail.loading) {
    content = <Notice>Loading cache…</Notice>
  } else if (detail.error) {
    content = (
      <Notice role="alert">
        <p>
          We couldn’t load this cache.{' '}
          <button type="button" onClick={detail.retry} className={TEXT_LINK}>
            Try again
          </button>
        </p>
      </Notice>
    )
  } else if (!cache || !cache.is_active || outcome === 'inactive') {
    title = 'Can’t log this cache'
    content = (
      <Notice>
        <p>
          {cache
            ? 'This cache has been taken down, so it can’t be logged anymore.'
            : 'We couldn’t find that cache. It may have been taken down, or the link is wrong.'}
        </p>
        <Button to="/map" variant="secondary" className="lg:w-fit" fullWidth>
          Back to the map
        </Button>
      </Notice>
    )
  } else if (outcome === 'logged') {
    title = 'Find logged!'
    content = <FindLogged cache={cache} totalPoints={totalPoints} />
  } else if (detail.isHider || outcome === 'hider') {
    title = 'Your own cache'
    content = (
      <Notice>
        <p className="text-text-primary">You hid this cache, so you can’t log it as a find.</p>
        <Button to={`/caches/${cacheId}`} variant="secondary" className="lg:w-fit" fullWidth>
          Back to cache
        </Button>
      </Notice>
    )
  } else if (detail.existingFind || outcome === 'already-found') {
    title = 'Already logged'
    content = (
      <Notice>
        <p className="text-text-primary">
          You’ve already logged this cache!
          {detail.existingFind && ` You found it on ${formatFoundDate(detail.existingFind.created_at)}.`}
        </p>
        <div className="flex flex-col gap-3 lg:flex-row">
          <Button to="/journal" fullWidth className="lg:w-fit">
            See your journal
          </Button>
          <Button to={`/caches/${cacheId}`} variant="secondary" fullWidth className="lg:w-fit">
            Back to cache
          </Button>
        </div>
      </Notice>
    )
  } else {
    content = <LogFindForm cache={cache} cacheId={cacheId} onResult={handleResult} />
  }

  const showBack = outcome !== 'logged' && !signedOut

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
        {/* One 448px column on every screen size, as in Figma. The success
            screen starts lower, closer to the middle of the screen. */}
        <div
          className={`mx-auto flex w-full max-w-[28rem] flex-1 flex-col gap-5 px-4 lg:px-0 ${
            outcome === 'logged' ? 'pb-8 pt-16 lg:pt-24' : 'pt-4 lg:pb-12 lg:pt-10'
          }`}
        >
          {showBack && <BackToCache cacheId={cacheId} />}
          {content}
        </div>
      </main>
    </div>
  )
}

export default LogFindPage
