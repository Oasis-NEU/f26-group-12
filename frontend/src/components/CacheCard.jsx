import { Link } from 'react-router'
import checkIcon from '../assets/figma/check.svg'
import DifficultyMeter from './DifficultyMeter.jsx'

// A cache in a list, from the Figma "CacheCard" component.
// Used in the desktop map list, the phone map card, and anywhere caches are listed.
//
// Figma variants -> props:
//   Found: true        -> found      (shows the "Found by you" tag)
//   State: Selected    -> selected   (matches the pin someone clicked on the map)
//   State: Hover       -> hover: classes (automatic)
//
// It renders the right element for the job:
//   <CacheCard to="/caches/abc" ... />     -> <Link>, an <a> (opens the cache page)
//   <CacheCard onClick={select} ... />     -> <button> (e.g. selects it on the map)
//   neither                                -> a plain box
// Everything inside is a <span> because a <button> can't contain <p> or <div>.

function CacheCard({
  title,
  location,
  difficulty,
  found = false,
  selected = false,
  to,
  onClick,
  className = '',
}) {
  const isInteractive = Boolean(to || onClick)
  const classes = [
    'flex w-full flex-col gap-2 rounded-2xl border border-border-subtle bg-bg-surface p-4 text-left',
    // Selected is a 2px border in Figma. The inset ring adds the second pixel
    // inside the 1px border, so the card doesn't grow.
    selected ? 'ring-1 ring-inset ring-border-strong' : '',
    isInteractive && !selected ? 'hover:bg-bg-subtle' : '',
    isInteractive ? 'cursor-pointer' : '',
    className,
  ].join(' ')

  const content = (
    <>
      <span className="flex w-full items-start gap-3">
        <span className="min-w-0 flex-1 text-body-strong text-text-primary">{title}</span>
        {found && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-found-soft py-[3px] pl-2 pr-3">
            {/* Figma's check is 11.75 x 8.75 and overflows its 10 x 7 box a little. */}
            <span className="relative h-[7px] w-[10px] shrink-0" aria-hidden="true">
              <img
                src={checkIcon}
                width={11.75}
                height={8.75}
                alt=""
                className="absolute inset-[-12.5%_-8.75%] block max-w-none"
              />
            </span>
            <span className="whitespace-nowrap text-tag text-found">Found by you</span>
          </span>
        )}
      </span>
      <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="whitespace-nowrap text-small text-text-secondary">{location}</span>
        <DifficultyMeter level={difficulty} />
      </span>
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={selected} className={classes}>
        {content}
      </button>
    )
  }

  return <div className={classes}>{content}</div>
}

export default CacheCard
