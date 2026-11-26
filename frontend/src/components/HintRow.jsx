// One hint on a cache, from the Figma "HintRow" component.
//
// Figma variants -> props:
//   State: Locked | Revealed -> revealed={false} | revealed={true}
//
// Hints unlock in order. A locked row is a button that says "Tap to reveal";
// pass canReveal={false} while an earlier hint is still locked and it says
// "Reveal hint N first" instead (and can't be pressed).
//
//   <HintRow number={2} text={hint} revealed={isOpen} onReveal={() => open(2)} />

function HintRow({ number, text, revealed = false, canReveal = true, onReveal, className = '' }) {
  return (
    // aria-live tells screen readers to read the hint out when it appears.
    <div aria-live="polite" className={`w-full ${className}`}>
      {revealed ? (
        <div className="flex flex-col gap-1 rounded-lg border border-border-subtle bg-bg-surface px-4 py-3">
          <p className="text-small text-text-secondary">Hint {number}</p>
          <p className="text-body text-text-primary">{text}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={onReveal}
          disabled={!canReveal}
          className="flex h-12 w-full items-center justify-between gap-4 rounded-lg bg-bg-subtle px-4 text-left enabled:cursor-pointer disabled:cursor-not-allowed"
        >
          <span className="whitespace-nowrap text-body-strong text-text-primary">Hint {number}</span>
          <span className="text-small text-text-secondary">
            {canReveal ? 'Tap to reveal' : `Reveal hint ${number - 1} first`}
          </span>
        </button>
      )}
    </div>
  )
}

export default HintRow
