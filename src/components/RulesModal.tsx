import { useCallback, useEffect, useState } from 'react'
import { saveRulesDismissed } from '../sound'

type Props = {
  onClose: () => void
}

const LEGEND = [
  { className: 'cell-hit', label: 'Hit — a ship was struck here' },
  { className: 'cell-miss', label: 'Miss — open water' },
  { className: 'cell-sunk', label: 'Sunk — every cell of that ship is hit' },
  { className: 'cell-ship', label: 'Ship — one of your vessels' },
]

export function RulesModal({ onClose }: Props) {
  const [dontShowAgain, setDontShowAgain] = useState(false)

  const close = useCallback(() => {
    if (dontShowAgain) saveRulesDismissed(true)
    onClose()
  }, [dontShowAgain, onClose])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label="How to play"
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className="overlay-card overlay-card-wide">
        <h2>How to play</h2>

        <h3 className="rules-heading">Legend</h3>
        <ul className="legend">
          {LEGEND.map((item) => (
            <li key={item.className}>
              <span className={`legend-swatch cell ${item.className}`} aria-hidden>
                <span className="marker" />
              </span>
              {item.label}
            </li>
          ))}
        </ul>

        <h3 className="rules-heading">Rules</h3>
        <ul className="rules-list">
          <li>Ships never touch — not even diagonally. Leave a gap around each one.</li>
          <li>Turn order: you fire a shot, then the AI replies.</li>
          <li>
            During setup, press <kbd>R</kbd> to rotate the selected ship.
          </li>
          <li>
            Move around a grid with the arrow keys and fire with <kbd>Enter</kbd>.
          </li>
          <li>Win by sinking the entire enemy fleet before it sinks yours.</li>
        </ul>

        <label className="rules-dismiss">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(event) => setDontShowAgain(event.target.checked)}
          />
          Don&apos;t show again
        </label>

        <div className="overlay-actions">
          <button type="button" className="primary" autoFocus onClick={close}>
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
