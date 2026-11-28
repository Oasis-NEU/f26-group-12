import { Link } from 'react-router'
import { getInitials } from '../components/accountData.js'
import Button from '../components/Button.jsx'
import { FOCUS_RING } from '../components/focusRing.js'
import SiteHeader from '../components/SiteHeader.jsx'
import { findsLabel, pointsUnit } from '../lib/leaderboard.js'
import { useLeaderboard } from '../lib/useLeaderboard.js'

// The leaderboard: /leaderboard
//
// Everyone who has found a cache, ranked by points (the difficulty of every
// cache they've found, added up). Anyone can see it, logged in or not; the
// logged-in person's own row is highlighted. The data comes from
// useLeaderboard (src/lib), which calls the leaderboard database function:
// totals only, never which caches anyone found, never secret codes.
//
// contrast-more: classes apply when someone turns on Increase Contrast
// (iPhone: Settings > Accessibility > Display & Text Size): faint row edges
// darken, so the list stays crisp in bright sun.

const HEADING_ID = 'leaderboard-heading'
const TEXT_LINK = `-my-1 rounded-sm py-1 font-bold text-text-primary underline underline-offset-4 hover:decoration-2 ${FOCUS_RING}`
const CARD_BORDER = 'border-border-subtle contrast-more:border-border-input'

// One person on the board: rank, avatar initials, name and finds, points.
// Your own row gets the selected-card look (a 2px ink edge, drawn as a 1px
// border plus a 1px inset ring so it doesn't grow) on the Subtle fill, and
// "(you)" after your name, so it never rests on colour alone.
function LeaderboardRow({ person }) {
  const you = person.isMe
  const unit = pointsUnit(person.points)
  return (
    <li
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
        you ? 'border-border-strong bg-bg-subtle ring-1 ring-inset ring-border-strong' : `bg-bg-surface ${CARD_BORDER}`
      }`}
    >
      {/* min-w-6 fits the list's 1- and 2-digit ranks, so names stay lined up. */}
      <p className="min-w-6 shrink-0 text-body-strong tabular-nums">
        <span className="sr-only">Rank </span>
        {person.rank}
      </p>
      {/* Decoration only (the name is right beside it), so screen readers skip it.
          On your row it's white, so it still shows on the Subtle fill. */}
      <span
        aria-hidden="true"
        className={`flex size-9 shrink-0 items-center justify-center rounded-full text-tag lg:size-10 lg:text-label ${
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
      {/* Star Gold Soft: the background DESIGN.md keeps for points earned. */}
      <p className="shrink-0 rounded-full bg-highlight-soft px-3 py-1 text-body-strong tabular-nums">
        {person.points}
        <span aria-hidden="true"> {unit.short}</span>
        <span className="sr-only"> {unit.spoken}</span>
      </p>
    </li>
  )
}

// Loading and errors: a plain white box, like the cache page's.
function Notice({ children, role = 'status' }) {
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

// The quiet line above the list for anyone who isn't on it, so they don't
// have to scroll past 50 rows to learn how to join.
function JoinPrompt({ signedIn, onBoard }) {
  if (signedIn === false) {
    return (
      <p className="text-small text-text-secondary">
        <Link to="/login" className={TEXT_LINK}>
          Log in
        </Link>{' '}
        to see where you rank.
      </p>
    )
  }
  if (signedIn && !onBoard) {
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
  const onBoard = board.rows.some((person) => person.isMe) || Boolean(board.ownRowBelow)

  let content
  if (board.loading) {
    content = <Notice>Loading the leaderboard…</Notice>
  } else if (board.error) {
    content = (
      <Notice role="alert">
        We couldn’t load the leaderboard.{' '}
        <button
          type="button"
          onClick={board.retry}
          className={`cursor-pointer rounded-lg font-bold text-text-primary underline underline-offset-4 ${FOCUS_RING}`}
        >
          Try again
        </button>
      </Notice>
    )
  } else if (board.rows.length === 0) {
    content = <EmptyBoard />
  } else {
    content = (
      <>
        <JoinPrompt signedIn={board.signedIn} onBoard={onBoard} />
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
            <h1 id={HEADING_ID} className="text-display">
              Leaderboard
            </h1>
            <p className="text-small text-text-secondary lg:text-body">
              Points are the difficulty of every cache you’ve found, added up.
            </p>
            {content}
          </div>
        </div>
      </main>
    </div>
  )
}

export default LeaderboardPage
