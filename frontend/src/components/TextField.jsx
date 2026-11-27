import { useId } from 'react'
import { FOCUS_RING } from './focusRing.js'

// A labelled text input, from the Figma "TextField" component.
//
// Figma variants -> props:
//   State: Error     -> error="What went wrong and how to fix it"
//   State: Focus     -> focus-visible: classes (automatic)
//   Help / Show help -> help="..." (leave it out to hide the help row)
//
// Label above, 48px box, help or error text below. Errors show here, under
// the field, never on a new screen. Input text is 16px so phones don't zoom.
//
// Any other props (value, onChange, type, name, placeholder, required...)
// go straight to the <input>, e.g.
//   <TextField label="Cache name" value={title} onChange={(e) => setTitle(e.target.value)} />
//
// action (optional): a small button drawn inside the box at its right edge,
// like the eye that shows a password. The text stops short of it. Leave it
// out and the field looks exactly as before.

function TextField({ label, help, error, id, action, className = '', ...inputProps }) {
  // useId makes a unique id, so the <label> and help text can point at the input.
  const generatedId = useId()
  const inputId = id ?? generatedId
  const messageId = `${inputId}-message`
  const message = error || help

  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      <label htmlFor={inputId} className="text-label text-text-primary">
        {label}
      </label>

      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={[
            'h-12 w-full rounded-lg border border-border-input bg-bg-surface px-4 text-body text-text-primary',
            'placeholder:text-text-secondary',
            FOCUS_RING,
            // Figma draws Error as a 2px red border. The 1px border plus a 1px
            // inset ring looks the same and keeps the text from shifting.
            error ? 'border-error inset-ring-1 inset-ring-error' : '',
            // Room for the action button, so text doesn't run under it.
            action ? 'pr-13' : '',
          ].join(' ')}
          {...inputProps}
        />
        {/* 40px button inside the 48px box, 4px from its edges. */}
        {action && <div className="absolute right-1 top-1 flex">{action}</div>}
      </div>

      {message && (
        <div id={messageId} className="flex items-start gap-2">
          {error && (
            <span
              aria-hidden="true"
              className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-error font-display text-[12px]/[14px] font-bold text-text-on-accent"
            >
              !
            </span>
          )}
          <p className={`text-small ${error ? 'text-error' : 'text-text-secondary'}`}>{message}</p>
        </div>
      )}
    </div>
  )
}

export default TextField
