import { FOCUS_RING } from '../focusRing.js'

// Styles shared by the cache form's pieces (Hide a cache and Edit cache), so
// both pages always look the same.

// A one-line or multi-line box with the same look as a TextField.
export const FIELD_BOX = `w-full rounded-lg border border-border-input bg-bg-surface px-4 text-body text-text-primary placeholder:text-text-secondary ${FOCUS_RING}`

// Something that just appeared fades in and rises 4px (200ms, the shared
// ease-out), like a hint being revealed; with reduced motion it only
// fades. starting: is the style it animates from (CSS @starting-style).
export const RISE_IN =
  'transition-[opacity,translate] duration-200 ease-out starting:translate-y-1 starting:opacity-0 motion-reduce:starting:translate-y-0'

// A message that just appeared fades in (150ms).
export const FADE_IN = 'transition-opacity duration-150 ease-out starting:opacity-0'

// Ids the pages move focus to when a field needs fixing.
export const LOCATION_BUTTON_ID = 'use-my-location'
export const DIFFICULTY_FIRST_ID = 'difficulty-1'

// Enter in a one-line field moves to the next field instead of saving the
// whole form (the keyboard's Go would otherwise save half a cache). Only
// the form's main button saves. Use it as the form's onKeyDown.
export function moveToNextField(event) {
  if (event.key !== 'Enter' || event.target.tagName !== 'INPUT' || event.target.type === 'radio') return
  event.preventDefault()
  const fields = [...event.currentTarget.querySelectorAll('input:not([type="radio"]), textarea')]
  fields[fields.indexOf(event.target) + 1]?.focus()
}
