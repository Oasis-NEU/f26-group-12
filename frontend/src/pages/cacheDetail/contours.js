// Draws topographic contour lines for the map versions of the cache detail
// page. Kept in its own file because component files should only export
// components (React's fast refresh needs that).

// One wobbly ring around (cx, cy), as an SVG path. A few sine waves bend the
// circle so the rings look like hills on a map instead of perfect circles.
export function contourRing(cx, cy, radius, seed) {
  const steps = 64
  let d = ''
  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2
    const r = radius * (1 + 0.08 * Math.sin(3 * angle + seed) + 0.05 * Math.sin(5 * angle + seed * 2))
    const x = cx + r * Math.cos(angle) * 1.7 // stretched sideways, like real contours
    const y = cy + r * Math.sin(angle)
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return `${d}Z`
}
