import { isSunk } from '../game/board'
import type { Board, ShipSpec } from '../game/types'

type Props = {
  title: string
  fleet: ShipSpec[]
  board: Board
  /** Setup mode lets the player select or pick a ship back up. */
  selectedShipId?: string | null
  onSelect?: (shipId: string) => void
  onRemove?: (shipId: string) => void
  setup?: boolean
}

export function FleetPanel({
  title,
  fleet,
  board,
  selectedShipId,
  onSelect,
  onRemove,
  setup = false,
}: Props) {
  return (
    <section className="panel fleet-panel">
      <h2>{title}</h2>
      <ul className="fleet-list">
        {fleet.map((spec) => {
          const ship = board.ships.find((s) => s.spec.id === spec.id)
          const sunk = ship ? isSunk(ship) : false
          const hits = ship ? ship.hits.filter(Boolean).length : 0
          const placed = Boolean(ship)
          const selected = selectedShipId === spec.id
          return (
            <li key={spec.id} className={`fleet-item${sunk ? ' sunk' : ''}${selected ? ' selected' : ''}`}>
              <button
                type="button"
                className="fleet-button"
                disabled={!setup}
                onClick={() => (placed ? onRemove?.(spec.id) : onSelect?.(spec.id))}
              >
                <span className="fleet-name">{spec.name}</span>
                <span className="pips" aria-hidden>
                  {Array.from({ length: spec.size }, (_, i) => (
                    <span key={i} className={`pip${i < hits ? ' pip-hit' : ''}${placed || !setup ? ' pip-placed' : ''}`} />
                  ))}
                </span>
                <span className="fleet-status">
                  {setup ? (placed ? 'Placed' : `${spec.size} cells`) : sunk ? 'Sunk' : `${spec.size - hits} left`}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
