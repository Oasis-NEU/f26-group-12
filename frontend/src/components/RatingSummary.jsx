import { Star } from 'lucide-react'
import { ratingLabel } from '../lib/cacheRatings.js'

// A cache's average rating: one gold star (Star Gold, dark outline, like the
// Star Rating's filled stars), the average in bold and how many ratings,
// e.g. "★ 4.6 (12)". Unrated caches say "No ratings yet". Small text.
//
// rating: { average, count } from loadCacheRatings. Leave it out (undefined)
// when ratings couldn't load, and nothing is shown, so a cache never looks
// unrated just because the numbers are missing.
// long: "(12 ratings)" instead of "(12)", for the cache page.

function RatingSummary({ rating, long = false, className = '' }) {
  if (rating === undefined) return null
  const label = ratingLabel(rating)
  if (!rating?.count || rating.average === null) {
    return <span className={`whitespace-nowrap text-small text-text-secondary ${className}`}>{label}</span>
  }
  const count = long ? `${rating.count} ${rating.count === 1 ? 'rating' : 'ratings'}` : rating.count
  return (
    <span className={`flex items-center gap-1 whitespace-nowrap text-small ${className}`}>
      <span className="sr-only">{label}</span>
      <Star aria-hidden="true" size={14} strokeWidth={1.75} className="shrink-0 fill-highlight text-text-primary" />
      <span aria-hidden="true" className="font-bold text-text-primary">
        {rating.average.toFixed(1)}
      </span>
      <span aria-hidden="true" className="text-text-secondary">
        ({count})
      </span>
    </span>
  )
}

export default RatingSummary
