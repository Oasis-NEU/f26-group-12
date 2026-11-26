import { useId } from 'react'

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

function TextField({ label, help, error, id, className = '', ...inputProps }) {
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

      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={[
          'h-12 w-full border border-border-input bg-bg-surface px-4 text-body text-text-primary',
          'placeholder:text-text-secondary',
          // Figma draws Focus and Error as a 2px border. An inset outline looks
          // the same and keeps the text from shifting by a pixel.
          'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus',
          error ? 'outline-2 -outline-offset-2 outline-error' : '',
        ].join(' ')}
        {...inputProps}
      />

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
