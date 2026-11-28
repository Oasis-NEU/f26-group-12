import { useId } from 'react'
import { DESCRIPTION_MAX_LENGTH } from '../../lib/hideCache.js'
import { FIELD_BOX } from './formStyles.js'

// The description: a 96px box, same look as a text field.
function DescriptionField({ value, onChange }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-label text-text-primary">
        Description (optional)
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="e.g. A small mint tin with a sticker on the lid."
        maxLength={DESCRIPTION_MAX_LENGTH}
        rows={3}
        aria-describedby={`${id}-help`}
        className={`min-h-24 resize-y py-3 ${FIELD_BOX}`}
      />
      <p id={`${id}-help`} className="text-small text-text-secondary">
        What to look for, not where it is: its size and what it looks like.
      </p>
    </div>
  )
}

export default DescriptionField
