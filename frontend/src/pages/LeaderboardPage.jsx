import { ArrowDown } from 'lucide-react'
import { useRef } from 'react'
import { Link } from 'react-router'
import { getInitials } from '../components/accountData.js'
import Button from '../components/Button.jsx'
import { FOCUS_RING } from '../components/focusRing.js'
import { useLoginDialog } from '../components/login/loginDialogContext.js'
import SiteHeader from '../components/SiteHeader.jsx'
import { findsLabel, pointsUnit, yourRankLine } from '../lib/leaderboard.js'
import { useLeaderboard } from '../lib/useLeaderboard.js'

// The leaderboard: /leaderboard
//
// Everyone who has found a cache, ranked by points (the difficulty of every
// cache they've found, added up). Anyone can see it, logged in or not; the
// logged-in person's own row is highlighted, and a line at the top says
// where they are, with a button that takes them to their row. The data comes
// from useLeaderboard (src/lib), which calls the leaderboard database
// function: totals only, never which caches anyone found, never secret codes.
//
// contrast-more: classes apply when someone turns on Increase Contrast
// (iPhone: Settings > Accessibility > Display & Text Size): faint row edges
// darken, so the list stays crisp in bright sun.

const HEADING_ID = 'leaderboard-heading'
const MY_ROW_ID = 'my-leaderboard-row'
// Inline links and the inline Try again button: bold, underlined, with a
// 28px tap area (the -my-1 py-1) that doesn't change the line's height.
const TEXT_LINK = `-my-1 cursor-pointer rounded-sm py-1 font-bold text-text-primary underline underline-offset-4 hover:decoration-2 ${FOCUS_RING}`
const CARD_BORDER = 'border-border-subtle contrast-more:border-border-input'

// Motion: the board arrives a moment after the page (it's loaded from the
// database), so it fades in once, all together (200ms, the shared ease-out),
// instead of popping in over the loading notice. No rise, no row-by-row
// stagger and no pulse on your row: it's a list to read, not a celebration.
// Only opacity changes, so it's the same with reduced motion on. starting:
// is the style it fades from (CSS @starting-style), which runs each time the
// wrapper below is put on the page.
const ARRIVE = 'transition-opacity duration-200 ease-out starting:opacity-0'

// One person on the board: rank, avatar initials (desktop), name and finds,
// points. Your own row gets the selected-card look (a 2px ink edge, drawn as
// a 1px border plus a 1px inset ring so it doesn't grow) on the Subtle fill,
// "(you)" after your name, so it never rests on colour alone. It also gets
// an id and tabIndex={-1}, so "Show
// my row" can move focus to it. Its focus ring is the site-wide outline
// (index.css), 2px outside the row, so it doesn't replace the ink edge the
// way the shared ring classes (box-shadow rings) would.
function LeaderboardRow({ person }) {
  const you = person.isMe
  const unit = pointsUnit(person.points)
  return (
    <li
      id={you ? MY_ROW_ID : undefined}
      tabIndex={you ? -1 : undefined}
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
        you ? 'border-border-strong bg-bg-subtle ring-1 ring-inset ring-border-strong' : `bg-bg-surface ${CARD_BORDER}`
      }`}
    >
      {/* min-w-8 fits 3-digit ranks (yours, under "Your place"), and
          tabular-nums gives every digit the same width, so names line up. */}
      <p className="min-w-8 shrink-0 text-body-strong tabular-nums">
        <span className="sr-only">Rank </span>
        {person.rank}
      </p>
      {/* Desktop only: on phones the name gets the room. Decoration (the name
          is right beside it), so screen readers skip it. On your row it's
          white, so it still shows on the Subtle fill. */}
      <span
        aria-hidden="true"
        className={`hidden size-10 shrink-0 items-center justify-center rounded-full text-label lg:flex ${
          you ? 'bg-bg-surface' : 'bg-bg-subtle'
        }`}
      >
        {getInitials(person.username)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* A long name is cut short with "…", but "(you)" always shows.
            title shows the whole name on hover; screen readers read it all. */}
        <p className="flex min-w-0 gap-1 text-body-strong">
          <span className="truncate" title={person.username}>
            {person.username}
          </span>
          {you && <span className="shrink-0">(you)</span>}
        </p>
        <p className="text-small text-text-secondary">{findsLabel(person.finds)}</p>
      </div>
      {/* Plain numbers for everyone, yours too: your row already stands out
          with its fill, ink edge and "(you)". */}
      <p className="shrink-0 text-right text-body-strong tabular-nums">
        {person.points}
        <span aria-hidden="true"> {unit.short}</span>
        <span className="sr-only"> {unit.spoken}</span>
      </p>
    </li>
  )
}

// Loading and errors: a plain white box, like the cache page's. The loading
// one has no role: the page's live region (below) says it instead.
function Notice({ children, role }) {
  return (
    <div role={role} className={`rounded-2xl border bg-bg-surface p-4 text-body text-text-secondary ${CARD_BORDER}`}>
      {children}
    </div>
  )
}

// Nobody has found a cache yet: say so, and point to the map.
function EmptyBoard() {
  return (
    <div className={`flex flex-col items-start gap-4 rounded-2xl border bg-bg-surface p-4 lg:p-6 ${CARD_BORDER}`}>
      <div className="flex flex-col gap-1">
        <h2 className="text-body-strong">Nobody’s on the board yet</h2>
        <p className="text-small text-text-secondary">Find a cache and log it to earn the first points.</p>
      </div>
      <Button variant="secondary" to="/map">
        Go to the map
      </Button>
    </div>
  )
}

// Moves focus to your row and scrolls it into view at once. Never smooth
// scrolling: DESIGN.md keeps scrolling instant when focus moves.
function showMyRow() {
  const row = document.getElementById(MY_ROW_ID)
  if (!row) return
  row.scrollIntoView({ block: 'center' })
  row.focus({ preventScroll: true })
}

// The line above the list. On the board: where you are, and a quiet button
// to your row. Signed out, or not on the board yet: how to join, so nobody
// has to scroll past 50 rows to find out.
function TopLine({ signedIn, myRow }) {
  const { openLogin } = useLoginDialog()
  if (myRow) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-body-strong">{yourRankLine(myRow)}</p>
        {/* A quiet button (no outline; fills Subtle on hover): it does
            something on this page, so it's a button, not a link. */}
        <button
          type="button"
          onClick={showMyRow}
          className={`-mx-3 flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-label text-text-primary hover:bg-bg-subtle active:scale-97 motion-safe:transition-[background-color,scale] motion-safe:duration-150 motion-safe:ease-out ${FOCUS_RING}`}
        >
          <ArrowDown aria-hidden="true" size={16} />
          Show my row
        </button>
      </div>
    )
  }
  if (signedIn === false) {
    return (
      <p className="text-small text-text-secondary">
        {/* Opens the login dialog over the board (an action, so a button
            dressed as the sentence's link); after logging in, this line
            becomes their rank. */}
        <button type="button" onClick={() => openLogin({ reason: 'Log in to see where you rank.' })} aria-haspopup="dialog" className={TEXT_LINK}>
          Log in
        </button>{' '}
        to see where you rank.
      </p>
    )
  }
  if (signedIn) {
    return (
      <p className="text-small text-text-secondary">
        You’re not on the board yet.{' '}
        <Link to="/map" className={TEXT_LINK}>
          Find a cache
        </Link>{' '}
        to earn your first points.
      </p>
    )
  }
  return null
}

function LeaderboardPage() {
  const board = useLeaderboard()
  const headingRef = useRef(null)
  // Your row, wherever it is: in the list, or under it.
  const myRow = board.rows.find((person) => person.isMe) ?? board.ownRowBelow

  // Try again: the button goes away while the board reloads, so focus moves
  // to the page heading instead of being lost (the live region then says
  // how it went). Only after this press, never on a normal load.
  function retry() {
    board.retry()
    headingRef.current?.focus({ preventScroll: true })
  }

  // What fills the page under the intro: the loading notice (no fade; it's
  // there from the start), then whatever loaded, which fades in.
  let content
  if (board.loading) {
    content = <Notice>Loading the leaderboard…</Notice>
  } else if (board.error) {
    content = (
      <Notice role="alert">
        {/* A timeout is most likely a weak signal outdoors, so it says so. */}
        {board.timedOut
          ? 'The leaderboard took too long to load. Check your signal.'
          : 'We couldn’t load the leaderboard.'}{' '}
        <button type="button" onClick={retry} className={TEXT_LINK}>
          Try again
        </button>
      </Notice>
    )
  } else if (board.rows.length === 0) {
    content = <EmptyBoard />
  } else {
    content = (
      <>
        <TopLine signedIn={board.signedIn} myRow={myRow} />
        <ol aria-labelledby={HEADING_ID} className="flex flex-col gap-2">
          {board.rows.map((person) => (
            <LeaderboardRow key={person.username} person={person} />
          ))}
        </ol>
        {/* You're on the board, but not in the top 50: your row (with your real
            rank) sits under the list, so you can see where you stand. */}
        {board.ownRowBelow && (
          <section aria-labelledby="your-place-heading" className="flex flex-col gap-2 pt-2">
            <h2 id="your-place-heading" className="text-label text-text-secondary">
              Your place
            </h2>
            <ol aria-labelledby="your-place-heading">
              <LeaderboardRow person={board.ownRowBelow} />
            </ol>
          </section>
        )}
      </>
    )
  }

  // Said once to screen readers (politely): while loading, then once it's
  // loaded. An error is announced by its own alert instead.
  let announcement = ''
  if (board.loading) announcement = 'Loading the leaderboard…'
  else if (!board.error) announcement = 'Leaderboard loaded.'

  return (
    <div className="flex min-h-dvh flex-col bg-bg-page text-text-primary">
      {/* React 19 moves this into the page's <head>. */}
      <title>Leaderboard · HuskyCache</title>
      {/* Hidden until someone presses Tab, so keyboard users can jump past the header. */}
      <a
        href="#main-content"
        className={`sr-only rounded-lg bg-bg-surface px-4 py-2 text-label text-text-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 ${FOCUS_RING}`}
      >
        Skip to content
      </a>
      <SiteHeader />
      {/* The page's own <main> (Layout leaves it out here), with the header outside it.
          tabIndex={-1} lets the skip link move focus here. */}
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        {/* Phones: 16px margins. Desktop: the 10% page margin, with the list
            capped at 768px so a row's name and points stay close enough to read
            across. */}
        <div className="w-full p-4 lg:px-[10%] lg:pb-12 lg:pt-8">
          <div className="flex flex-col gap-4 lg:max-w-3xl">
            {/* tabIndex={-1}: Try again moves focus here. */}
            <h1 id={HEADING_ID} ref={headingRef} tabIndex={-1} className="text-display outline-none">
              Leaderboard
            </h1>
            <p className="text-small text-text-secondary lg:text-body">
              Points are the difficulty of every cache you’ve found, added up.
            </p>
            {/* Always on the page, so screen readers hear each change in it. */}
            <p role="status" className="sr-only">
              {announcement}
            </p>
            {board.loading ? (
              content
            ) : (
              // Try again goes back through loading, so the board (or the error)
              // fades in afresh each time.
              <div className={`flex flex-col gap-4 ${ARRIVE}`}>{content}</div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default LeaderboardPage
