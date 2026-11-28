import { Plus, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { HINT_MAX_LENGTH, MAX_HINTS } from '../../lib/hideCache.js'
import { FOCUS_RING } from '../focusRing.js'
import FormSection from './FormSection.jsx'
import { FIELD_BOX, RISE_IN } from './formStyles.js'

// Hints: up to 3, in order: just the fields, one under another, with no
// labels above them (each is still called "Hint 1", "Hint 2"... for screen
// readers, and the placeholders step up from vague to nearly giving it
// away). The next hint waits as a dashed "Add another hint" box in the spot
// its field will take, so adding one swaps the box for the field with
// nothing moving. Hints after the first have an × inside the field to
// remove them.
//
// Motion: when a hint is added, the next dashed box rises in (200ms). On
// page load everything just appears; with reduced motion it only fades.
//
// Each field gets a stable key, so removing hint 2 removes hint 2's field.

const HINT_PLACEHOLDERS = ['e.g. Sit on the steps and look down', 'A little more specific', 'Nearly gives it away']

function HintsSection({ hints, onChange }) {
  const listId = useId()
  const nextKey = useRef(hints.length)
  const [keys, setKeys] = useState(() => hints.map((_, index) => index))
  // Whether anything has been added or removed yet (lets the dashed box
  // rise in; on page load it just appears).
  const [changed, setChanged] = useState(false)

  function setHint(index, text) {
    onChange(hints.map((hint, i) => (i === index ? text : hint)))
  }

  function addHint() {
    const key = nextKey.current++
    setKeys((current) => [...current, key])
    setChanged(true)
    onChange([...hints, ''])
    // Move to the new field, so they can type straight away.
    requestAnimationFrame(() => document.getElementById(`${listId}-${hints.length}`)?.focus())
  }

  function removeHint(index) {
    setKeys((current) => current.filter((_, i) => i !== index))
    setChanged(true)
    onChange(hints.filter((_, i) => i !== index))
    requestAnimationFrame(() => document.getElementById(`${listId}-${Math.max(0, index - 1)}`)?.focus())
  }

  return (
    <FormSection title="Hints (optional)">
      <p className="-mt-2 text-small text-text-secondary">
        Up to 3. Start vague, and make each one give away a little more of where it is.
      </p>
      <ol className="flex flex-col gap-3">
        {hints.map((hint, index) => {
          const id = `${listId}-${index}`
          return (
            <li key={keys[index]} className="relative">
              <label htmlFor={id} className="sr-only">
                Hint {index + 1}
              </label>
              <input
                id={id}
                value={hint}
                onChange={(event) => setHint(index, event.target.value)}
                placeholder={HINT_PLACEHOLDERS[index]}
                maxLength={HINT_MAX_LENGTH}
                enterKeyHint="next"
                className={`h-12 ${index > 0 ? 'pr-13' : ''} ${FIELD_BOX}`}
              />
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => removeHint(index)}
                  aria-label={`Remove hint ${index + 1}`}
                  className={`absolute right-1 top-1 flex size-10 cursor-pointer items-center justify-center rounded-lg text-text-secondary hover:text-text-primary ${FOCUS_RING}`}
                >
                  <X aria-hidden="true" size={18} />
                </button>
              )}
            </li>
          )
        })}
        {/* The next hint's dashed box, keyed by the hint count so each new
            one rises in. */}
        {hints.length < MAX_HINTS && (
          <li key={`next-${hints.length}`} className={changed ? RISE_IN : ''}>
            <button
              type="button"
              onClick={addHint}
              className={`flex h-12 w-full cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-border-input px-4 text-label text-text-secondary hover:border-text-secondary hover:text-text-primary active:scale-97 contrast-more:border-text-secondary motion-safe:transition-[border-color,color,scale] motion-safe:duration-150 motion-safe:ease-out ${FOCUS_RING}`}
            >
              <Plus aria-hidden="true" size={18} strokeWidth={2.25} />
              Add another hint
            </button>
          </li>
        )}
      </ol>
    </FormSection>
  )
}

export default HintsSection
