import { coordLabel } from '../game/board'
import type { ShotEvent } from '../game/engine'
import { useDialog } from '../useDialog'

type Props = {
  history: ShotEvent[]
  onClose: () => void
}

function describe(event: ShotEvent): string {
  const label = coordLabel(event.coord)
  if (event.result === 'sunk') return `${label} — sank the ${event.shipName ?? 'ship'}`
  return `${label} — ${event.result}`
}

function ShotList({ title, shots, empty }: { title: string; shots: ShotEvent[]; empty: string }) {
  return (
    <div className="history-column">
      <h3>{title}</h3>
      {shots.length === 0 ? (
        <p className="history-empty">{empty}</p>
      ) : (
        <ol className="history-list">
          {shots.map((event) => (
            <li key={event.seq} className={`history-entry history-${event.result}`}>
              {describe(event)}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export function HistoryModal({ history, onClose }: Props) {
  const { ref, onKeyDown } = useDialog(onClose)

  const ordered = [...history].sort((a, b) => a.seq - b.seq)
  const yours = ordered.filter((event) => event.side === 'player')
  const enemy = ordered.filter((event) => event.side === 'ai')

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Shot history"
      ref={ref}
      onKeyDown={onKeyDown}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="overlay-card overlay-card-wide">
        <h2>Shot history</h2>
        <div className="history-columns">
          <ShotList title="Your shots" shots={yours} empty="You have not fired yet." />
          <ShotList title="Enemy shots" shots={enemy} empty="The enemy has not fired yet." />
        </div>
        <div className="overlay-actions">
          <button type="button" className="primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
