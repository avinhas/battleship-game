import { useState } from 'react'
import { coordLabel, isSunk, shipCells, validatePlacement } from '../game/board'
import type { Board, Coord, Orientation, ShipSpec } from '../game/types'

type Props = {
  board: Board
  /** Own board shows ships; enemy board hides everything but sunk ships. */
  revealShips: boolean
  interactive: boolean
  onCellClick?: (coord: Coord) => void
  ghost?: { spec: ShipSpec; orientation: Orientation } | null
  lastShot?: Coord | null
  label: string
}

const LETTERS = 'ABCDEFGHIJ'.split('')

export function BoardGrid({
  board,
  revealShips,
  interactive,
  onCellClick,
  ghost,
  lastShot,
  label,
}: Props) {
  const [hover, setHover] = useState<Coord | null>(null)

  const shipCellMap = new Map<string, { name: string; sunk: boolean }>()
  for (const ship of board.ships) {
    const sunk = isSunk(ship)
    if (!revealShips && !sunk) continue
    for (const cell of ship.cells) {
      shipCellMap.set(`${cell.row},${cell.col}`, { name: ship.spec.name, sunk })
    }
  }

  const ghostCells = new Set<string>()
  let ghostValid = false
  if (ghost && hover) {
    ghostValid = validatePlacement(board, ghost.spec, hover, ghost.orientation) === null
    for (const cell of shipCells(hover, ghost.orientation, ghost.spec.size)) {
      if (cell.row < board.size && cell.col < board.size) ghostCells.add(`${cell.row},${cell.col}`)
    }
  }

  return (
    <div className="board" aria-label={label}>
      <div className="board-grid" style={{ '--size': board.size } as React.CSSProperties}>
        <div className="corner" />
        {LETTERS.slice(0, board.size).map((letter) => (
          <div key={letter} className="axis">
            {letter}
          </div>
        ))}
        {Array.from({ length: board.size }, (_, row) => (
          <div className="row-wrapper" key={row} style={{ display: 'contents' }}>
            <div className="axis">{row + 1}</div>
            {Array.from({ length: board.size }, (_, col) => {
              const k = `${row},${col}`
              const shot = board.shots[row][col]
              const ship = shipCellMap.get(k)
              const classes = ['cell']
              if (ship) classes.push(ship.sunk ? 'cell-sunk-ship' : 'cell-ship')
              if (shot === 'miss') classes.push('cell-miss')
              if (shot === 'hit') classes.push('cell-hit')
              if (shot === 'sunk') classes.push('cell-sunk')
              if (ghostCells.has(k)) classes.push(ghostValid ? 'cell-ghost' : 'cell-ghost-bad')
              if (lastShot && lastShot.row === row && lastShot.col === col) {
                classes.push('cell-last')
              }
              const coord = { row, col }
              const disabled = !interactive || (!ghost && shot !== 'empty')
              return (
                <button
                  key={k}
                  type="button"
                  className={classes.join(' ')}
                  disabled={disabled}
                  aria-label={`${label} ${coordLabel(coord)}${
                    shot === 'empty' ? '' : ` ${shot}`
                  }`}
                  onClick={() => onCellClick?.(coord)}
                  onMouseEnter={() => ghost && setHover(coord)}
                  onMouseLeave={() => ghost && setHover(null)}
                >
                  <span className="marker" />
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
