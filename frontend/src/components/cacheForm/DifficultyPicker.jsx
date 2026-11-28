import { useId } from 'react'
import { DIFFICULTY_MEANINGS } from '../../lib/hideCache.js'
import DifficultyMeter from '../DifficultyMeter.jsx'
import FieldMessage from './FieldMessage.jsx'
import { DIFFICULTY_FIRST_ID } from './formStyles.js'

// Difficulty 1-5: five big options, one picked at a time (radio buttons,
// so arrow keys move between them). The picked one is the Inverse fill,
// bars beside the label show it the way difficulty always appears, and the
// line under the options says what it means. (The legend has to be the
// fieldset's first child to name the group, so it's for screen readers;
// the visible row repeats it with the bars.)
function DifficultyPicker({ value, onChange, error }) {
  const messageId = useId()
  return (
    <fieldset aria-describedby={messageId} aria-required="true" className="flex flex-col gap-2">
      <legend className="sr-only">Difficulty</legend>
      <div aria-hidden="true" className="flex items-center justify-between gap-4">
        <span className="text-label text-text-primary">Difficulty</span>
        {value && <DifficultyMeter level={value} showLabel={false} />}
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((level) => (
          <label
            key={level}
            // The fill eases in (150ms) and the option shrinks to 97% while
            // pressed, like a Button, so a tap feels heard. With an error,
            // the outline turns red and is drawn 2px, like a field's.
            className={`flex h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border text-body-strong active:scale-97 motion-safe:transition-[background-color,border-color,color,scale] motion-safe:duration-150 motion-safe:ease-out has-focus-visible:ring-2 has-focus-visible:ring-focus has-focus-visible:ring-offset-2 ${
              value === level
                ? 'border-bg-inverse bg-bg-inverse text-text-on-accent'
                : `bg-bg-surface text-text-primary hover:bg-bg-subtle ${
                    error ? 'border-error inset-ring-1 inset-ring-error' : 'border-border-strong'
                  }`
            }`}
          >
            <input
              id={level === 1 ? DIFFICULTY_FIRST_ID : undefined}
              type="radio"
              name="difficulty"
              value={level}
              checked={value === level}
              onChange={() => onChange(level)}
              aria-invalid={error ? true : undefined}
              className="sr-only"
            />
            {level}
            {/* Each option's full name for screen readers: "1, easy to spot". */}
            <span className="sr-only">, {DIFFICULTY_MEANINGS[level].toLowerCase()}</span>
          </label>
        ))}
      </div>
      <FieldMessage
        id={messageId}
        error={error}
        help={value ? `Difficulty ${value}: ${DIFFICULTY_MEANINGS[value]}` : '1 = easy to spot, 5 = a real challenge'}
      />
    </fieldset>
  )
}

export default DifficultyPicker
