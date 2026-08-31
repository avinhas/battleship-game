import { useRef, useState } from 'react'
import { coordLabel, isSunk, shipCells, validatePlacement } from '../game/board'
import type { ShotEvent } from '../game/engine'
import type { Board, Coord, Orientation, ShipSpec } from '../game/types'

type Props = {
  board: Board
  /** Own board shows ships; enemy board hides everything but sunk ships. */
  revealShips: boolean
  interactive: boolean
  onCellClick?: (coord: Coord) => void
  ghost?: { spec: ShipSpec; orientation: Orientation } | null
  /** Most recent shot on this board, replayed as a splash or blast animation. */
  pulse?: ShotEvent | null
  label: string
}

const LETTERS = 'ABCDEFGHIJ'.split('')

export function BoardGrid({ board, revealShips, interactive, onCellClick, ghost, pulse, label }: Props) {
  const [hover, setHover] = useState<Coord | null>(null)
  const [focused, setFocused] = useState<Coord>({ row: 0, col: 0 })
  const cellRefs = useRef(new Map<string, HTMLButtonElement>())

  const moveFocus = (coord: Coord) => {
    const row = Math.min(Math.max(coord.row, 0), board.size - 1)
    const col = Math.min(Math.max(coord.col, 0), board.size - 1)
    setFocused({ row, col })
    cellRefs.current.get(`${row},${col}`)?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent, coord: Coord) => {
    const moves: Record<string, Coord> = {
      ArrowUp: { row: coord.row - 1, col: coord.col },
      ArrowDown: { row: coord.row + 1, col: coord.col },
      ArrowLeft: { row: coord.row, col: coord.col - 1 },
      ArrowRight: { row: coord.row, col: coord.col + 1 },
      Home: { row: coord.row, col: 0 },
      End: { row: coord.row, col: board.size - 1 },
    }
    const target = moves[event.key]
    if (!target) return
    event.preventDefault()
    moveFocus(target)
  }

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
              const pulsed = pulse && pulse.coord.row === row && pulse.coord.col === col
              const classes = ['cell']
              if (ship) classes.push(ship.sunk ? 'cell-sunk-ship' : 'cell-ship')
              if (shot === 'miss') classes.push('cell-miss')
              if (shot === 'hit') classes.push('cell-hit')
              if (shot === 'sunk') classes.push('cell-sunk')
              if (ghostCells.has(k)) classes.push(ghostValid ? 'cell-ghost' : 'cell-ghost-bad')
              if (pulsed) classes.push(`cell-pulse cell-pulse-${pulse.result}`)
              const coord = { row, col }
              const disabled = !interactive || (!ghost && shot !== 'empty')
              return (
                <button
                  key={pulsed ? `${k}-${pulse.seq}` : k}
                  type="button"
                  className={classes.join(' ')}
                  ref={(node) => {
                    if (node) cellRefs.current.set(k, node)
                    else cellRefs.current.delete(k)
                  }}
                  aria-disabled={disabled}
                  tabIndex={focused.row === row && focused.col === col ? 0 : -1}
                  aria-label={`${label} ${coordLabel(coord)}${shot === 'empty' ? '' : ` ${shot}`}`}
                  onClick={() => {
                    if (disabled) return
                    onCellClick?.(coord)
                  }}
                  onFocus={() => setFocused(coord)}
                  onKeyDown={(event) => onKeyDown(event, coord)}
                  onMouseEnter={() => ghost && setHover(coord)}
                  onMouseLeave={() => ghost && setHover(null)}
                >
                  <span className="marker" />
                  {pulsed && <span className="splash" aria-hidden />}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
