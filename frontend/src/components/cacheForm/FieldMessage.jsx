import { FADE_IN } from './formStyles.js'

// An error or help line under a field, with the "!" icon for errors (as
// in TextField: the same 18px circle and 12px/14px "!", written with the
// standard scale, size-4.5 and text-xs/3.5). A new error fades in.
function FieldMessage({ id, error, help }) {
  if (!error && !help) return null
  return (
    <div id={id} key={error || 'help'} className={`flex items-start gap-2 ${error ? FADE_IN : ''}`}>
      {error && (
        <span
          aria-hidden="true"
          className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-error font-display text-xs/3.5 font-bold text-text-on-accent"
        >
          !
        </span>
      )}
      <p className={`text-small ${error ? 'text-error' : 'text-text-secondary'}`}>{error || help}</p>
    </div>
  )
}

export default FieldMessage
