import { useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import checkIcon from '../assets/figma/check.svg'
import DifficultyMeter from './DifficultyMeter.jsx'
import RatingSummary from './RatingSummary.jsx'

// A cache in a list, from the Figma "CacheCard" component (reworked
// 2026-11-27: photo, rating, difficulty on its own line; then the photo
// moved to the top, like the Journal's finds). Used in the map's list and
// the Journal's Favorites, and anywhere caches are listed.
//
// Layout: the photo of the spot across the top, 3:1 (flat, so a list for
// choosing a cache still shows several at once). With no photo (or one that
// won't load) there's no photo area at all, and the card starts with the
// name. Then the name, the place (with the found tag after it, so a long
// name keeps the full width), and a line with the difficulty and the
// average rating.
//
// Props: title, location, difficulty, image (photo URL, optional), rating
// ({ average, count } from loadCacheRatings; leave it out if ratings
// couldn't load, and the rating isn't shown), found, selected, to / onClick,
// corner (an extra control for the top-right corner, e.g. <FavoriteButton>),
// roomy (the Journal's look: a 2:1 photo on phones and 3:1 on desktop, and
// 16px padding, 20px on desktop, so its Favorites match its finds).
//
// Figma variants -> props:
//   Found: true        -> found      (shows the "Found by you" tag)
//   State: Selected    -> selected   (matches the pin someone clicked on the map)
//   State: Hover       -> hover: classes (automatic)
//
// The title is the right element for the job, stretched over the card:
//   <CacheCard to="/caches/abc" ... />     -> a <Link> (opens the cache page)
//   <CacheCard onClick={select} ... />     -> a <button> (e.g. selects it on the map)
//   neither                                -> plain text in a box

// The "Found by you" pill (Figma "FoundByYouTag"), on its own so other
// places, like the map's cache card, can show the same tag.
export function FoundTag() {
  return (
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
  )
}

// The photo across the top of the card. Decorative: the card's text
// already names the cache. Its top corners follow the card's (its 16px less
// its 1px edge), so the card itself doesn't need to clip (which would cut
// off the heart's failure note). The photo's address comes from whoever hid
// the cache, so the browser doesn't tell that site which page you're on
// (no-referrer).
//
// While it downloads, a Subtle band holds its place (so nothing moves), and
// the photo fades in over it when it arrives (200ms) instead of popping in.
// A photo the browser already has (the card came back after a filter
// change, or on returning to the map) just shows: re-fading those would
// make the list shimmer, and lists don't animate when a filter changes. A
// fade isn't movement, so it stays with reduced motion on.
//
// If it won't load: when that happens off screen (usually), onFail tells the
// card, which leaves the photo area out. If the band is already on screen,
// it stays as an empty Subtle band instead, so the list doesn't jump under
// someone's thumb.
//
// darkens: while the card's link is hovered, the photo dims a little
// (95% brightness, 150ms), so the whole card answers the pointer, not just
// the text under it.
function CardPhoto({ image, roomy, darkens, onFail }) {
  const bandRef = useRef(null)
  // 'loading', 'fading' (arrived after the card appeared), 'shown' (already
  // there) or 'failed' (broke while on screen: the empty band stays).
  const [state, setState] = useState('loading')

  function handleError() {
    const band = bandRef.current?.getBoundingClientRect()
    const onScreen = band && band.bottom > 0 && band.top < window.innerHeight
    if (onScreen) setState('failed')
    else onFail()
  }

  return (
    <span
      ref={bandRef}
      className={`block w-full overflow-hidden rounded-t-[calc(var(--radius-2xl)-1px)] bg-bg-subtle ${
        roomy ? 'aspect-[2/1] lg:aspect-[3/1]' : 'aspect-[3/1]'
      } ${
        darkens
          ? 'transition-[filter] duration-150 ease-out group-has-[[data-card-action]:hover]/card:brightness-95'
          : ''
      }`}
    >
      <img
        // Already downloaded when the card appears: show it straight away.
        ref={(img) => {
          if (img?.complete && img.naturalWidth > 0 && state === 'loading') setState('shown')
        }}
        src={image}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setState((current) => (current === 'loading' ? 'fading' : current))}
        onError={handleError}
        className={`size-full object-cover ${
          state === 'loading' || state === 'failed' ? 'opacity-0' : 'opacity-100'
        } ${state === 'fading' ? 'transition-opacity duration-200 ease-out' : ''}`}
      />
    </span>
  )
}

function CacheCard({
  title,
  location,
  difficulty,
  image,
  rating,
  found = false,
  selected = false,
  to,
  onClick,
  corner,
  roomy = false,
  className = '',
}) {
  const detailsId = useId()
  // The photo that wouldn't load (if any), so the card drops its photo area.
  const [failedImage, setFailedImage] = useState(null)
  const hasPhoto = Boolean(image) && failedImage !== image
  const isInteractive = Boolean(to || onClick)
  // The card is a plain box; its title is the real link (or button), with an
  // invisible layer (::after) stretched over the whole card, so clicking
  // anywhere on it still opens it. That leaves room for a second control in
  // the corner (the save button), which can't sit inside a link. The rest of
  // the card describes the link (aria-describedby), so screen readers hear
  // the name first and the details after.
  //
  // Hover, press and keyboard focus are drawn on the whole card while
  // they're on that link (has-[...]), not while they're on the corner button.
  //
  // Motion: hover fills and the selected outline ease in (150ms), and the
  // card shrinks to 98% while pressed (a bit less than a button's 97%, since
  // it's bigger), so a tap feels heard. The list itself doesn't animate when
  // a search or filter changes it: that happens as you type.
  const classes = [
    'group/card relative flex w-full flex-col rounded-2xl border text-left motion-safe:transition-[background-color,border-color,box-shadow,outline-color,scale] motion-safe:duration-150 motion-safe:ease-out',
    // Selected is a 2px dark border in Figma. The 1px border plus a 1px
    // outline just inside it looks the same, so the card doesn't grow. (An
    // outline, not an inset ring: the photo would cover a ring.) It also
    // fills Subtle, so it still reads where a dark photo swallows the edge.
    // Otherwise the edge is Border Subtle, darkened with Increase Contrast
    // like every card.
    selected
      ? 'border-border-strong bg-bg-subtle outline-1 -outline-offset-2 outline-border-strong'
      : 'border-border-subtle bg-bg-surface outline-transparent contrast-more:border-border-input',
    // Written out in full so Tailwind finds them (it can't see pieced-together names).
    isInteractive && !selected ? 'has-[[data-card-action]:hover]:bg-bg-subtle' : '',
    isInteractive
      ? 'has-[[data-card-action]:active]:scale-98 has-[[data-card-action]:focus-visible]:ring-2 has-[[data-card-action]:focus-visible]:ring-focus has-[[data-card-action]:focus-visible]:ring-offset-2'
      : '',
    className,
  ].join(' ')

  // The title, as the card's link or button when it has one.
  const titleText = 'wrap-break-word text-body-strong text-text-primary'
  const stretched = `cursor-pointer text-left focus-visible:outline-hidden after:absolute after:inset-0 after:rounded-2xl after:content-['']`
  let titleElement = <span className={titleText}>{title}</span>
  if (to) {
    titleElement = (
      <Link to={to} data-card-action aria-describedby={detailsId} className={`${titleText} ${stretched}`}>
        {title}
      </Link>
    )
  } else if (onClick) {
    titleElement = (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        aria-describedby={detailsId}
        data-card-action
        className={`${titleText} ${stretched}`}
      >
        {title}
      </button>
    )
  }

  return (
    <div className={classes}>
      {hasPhoto && (
        <CardPhoto
          key={image}
          image={image}
          roomy={roomy}
          darkens={isInteractive && !selected}
          onFail={() => setFailedImage(image)}
        />
      )}
      <div className={`flex min-w-0 flex-col gap-1 ${roomy ? 'p-4 lg:p-5' : 'p-3'}`}>
        {/* Room on the right for the corner button, on the title line only
            (with a photo, the button sits on the photo instead). */}
        <div className={corner && !hasPhoto ? 'pr-9' : ''}>{titleElement}</div>
        <div id={detailsId} className="flex flex-col gap-1">
          {(location || found) && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {location && <span className="min-w-0 text-small text-text-secondary">{location}</span>}
              {found && <FoundTag />}
            </div>
          )}
          {/* Fits on one line in the 400px desktop list, even with "No ratings yet". */}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <DifficultyMeter level={difficulty} />
            <RatingSummary rating={rating} />
          </div>
        </div>
      </div>
      {/* Above the stretched link, so it gets its own clicks, 8px in on
          every card. On a photo it sits on a white circle with a faint ink
          edge and the pin shadow, so it reads on any picture, even bright
          sky or stone. */}
      {corner && (
        <div
          className={`absolute right-2 top-2 z-10 ${
            hasPhoto ? 'rounded-full bg-bg-surface shadow-pin ring-1 ring-text-primary/15' : ''
          }`}
        >
          {corner}
        </div>
      )}
    </div>
  )
}

export default CacheCard
