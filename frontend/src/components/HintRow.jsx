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

function HintRow({ number, text, revealed = false, canReveal = true, revealing = false, onReveal, className = '' }) {
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
    // aria-live tells screen readers to read the hint out when it appears.
    <div aria-live="polite" className={`w-full ${className}`}>
      {revealed ? (
        // contrast-more: is the Increase Contrast setting; faint edges darken.
        <div className="flex flex-col gap-1 rounded-lg border border-border-subtle bg-bg-surface px-4 py-3 contrast-more:border-border-input">
          <p className="text-small text-text-secondary">Hint {number}</p>
          <p className="text-body text-text-primary">{text}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={onReveal}
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
