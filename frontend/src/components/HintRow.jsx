import { useEffect, useRef } from 'react'
import { FOCUS_RING } from './focusRing.js'

// One hint on a cache, from the Figma "HintRow" component.
//
// Figma variants -> props:
//   State: Locked | Revealed -> revealed={false} | revealed={true}
//
// Hints unlock in order. A locked row is a button that says "Tap to reveal"
// ("Click to reveal" on desktop, as in the Figma desktop frames). Pass
// canReveal={false} while an earlier hint is still locked and it says
// "Reveal hint N first" instead (and can't be pressed). Pass revealing while
// the hint is loading and it says "Revealing…".
//
//   <HintRow number={2} text={hint} revealed={isOpen} onReveal={() => open(2)} />
//
// Focus: pressing the button replaces it with the hint, so focus moves to
// the revealed hint (and screen readers read it out). If revealing fails,
// focus goes back to the button so the person can try again.

function HintRow({ number, text, revealed = false, canReveal = true, revealing = false, onReveal, className = '' }) {
  const revealedRef = useRef(null)
  const buttonRef = useRef(null)
  // True from the moment someone presses this row's button until we've moved
  // focus. Hints shown on page load (e.g. when you've already found the
  // cache) don't steal focus.
  const askedRef = useRef(false)

  useEffect(() => {
    if (!askedRef.current) return
    if (revealed) {
      askedRef.current = false
      revealedRef.current?.focus()
    } else if (!revealing) {
      // The reveal finished without a hint (it failed): back to the button.
      askedRef.current = false
      buttonRef.current?.focus()
    }
  }, [revealed, revealing])

  function handleReveal() {
    askedRef.current = true
    onReveal?.()
  }

  let action
  if (!canReveal) {
    action = `Reveal hint ${number - 1} first`
  } else if (revealing) {
    action = 'Revealing…'
  } else {
    action = (
      <>
        <span className="lg:hidden">Tap</span>
        <span className="hidden lg:inline">Click</span> to reveal
      </>
    )
  }

  return (
    <div className={`w-full ${className}`}>
      {revealed ? (
        // tabIndex={-1} lets us move focus here after a reveal without adding
        // a stop to the Tab order. contrast-more: is the Increase Contrast
        // setting; faint edges darken.
        <div
          ref={revealedRef}
          tabIndex={-1}
          className={`flex flex-col gap-1 rounded-lg border border-border-subtle bg-bg-surface px-4 py-3 contrast-more:border-border-input ${FOCUS_RING}`}
        >
          <p className="text-small text-text-secondary">Hint {number}</p>
          <p className="wrap-break-word text-body text-text-primary">{text}</p>
        </div>
      ) : (
        <button
          ref={buttonRef}
          type="button"
          onClick={handleReveal}
          disabled={!canReveal || revealing}
          // Hover darkens it one step (enabled: so a row that can't be
          // revealed yet doesn't react). With Increase Contrast on
          // (contrast-more:) the row gets an outline, since its gray fill
          // barely shows against the page in bright light.
          className={`flex h-12 w-full items-center justify-between gap-4 rounded-lg bg-bg-subtle px-4 text-left enabled:hover:bg-border-subtle contrast-more:border contrast-more:border-border-input ${
            revealing ? 'cursor-wait' : 'enabled:cursor-pointer disabled:cursor-not-allowed'
          } ${FOCUS_RING}`}
        >
          <span className="whitespace-nowrap text-body-strong text-text-primary">Hint {number}</span>
          <span className="text-small text-text-secondary">{action}</span>
        </button>
      )}
    </div>
  )
}

export default HintRow
