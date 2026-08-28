import {
  BOARD_SIZE,
  type Board,
  type CellState,
  type Coord,
  type Orientation,
  type Ship,
  type ShipSpec,
  type ShotOutcome,
} from './types'

export function createBoard(size: number = BOARD_SIZE): Board {
  return {
    size,
    ships: [],
    shots: Array.from({ length: size }, () =>
      Array.from({ length: size }, () => 'empty' as CellState),
    ),
  }
}

export function shipCells(origin: Coord, orientation: Orientation, size: number): Coord[] {
  return Array.from({ length: size }, (_, i) =>
    orientation === 'horizontal'
      ? { row: origin.row, col: origin.col + i }
      : { row: origin.row + i, col: origin.col },
  )
}

export function inBounds(coord: Coord, size: number): boolean {
  return coord.row >= 0 && coord.row < size && coord.col >= 0 && coord.col < size
}

export type PlacementError = 'out-of-bounds' | 'overlap' | 'adjacent' | 'duplicate-ship'

/** Every cell a ship occupies plus the ring around it, diagonals included. */
function footprint(cells: Coord[]): Set<string> {
  const zone = new Set<string>()
  for (const cell of cells) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        zone.add(key({ row: cell.row + dr, col: cell.col + dc }))
      }
    }
  }
  return zone
}

export function validatePlacement(
  board: Board,
  spec: ShipSpec,
  origin: Coord,
  orientation: Orientation,
): PlacementError | null {
  if (board.ships.some((s) => s.spec.id === spec.id)) return 'duplicate-ship'
  const cells = shipCells(origin, orientation, spec.size)
  if (cells.some((c) => !inBounds(c, board.size))) return 'out-of-bounds'
  const occupied = new Set(board.ships.flatMap((s) => s.cells).map(key))
  if (cells.some((c) => occupied.has(key(c)))) return 'overlap'
  const buffer = footprint(board.ships.flatMap((s) => s.cells))
  if (cells.some((c) => buffer.has(key(c)))) return 'adjacent'
  return null
}

export function key(coord: Coord): string {
  return `${coord.row},${coord.col}`
}

export function placeShip(
  board: Board,
  spec: ShipSpec,
  origin: Coord,
  orientation: Orientation,
): Board {
  const error = validatePlacement(board, spec, origin, orientation)
  if (error) throw new Error(`Invalid placement: ${error}`)
  const cells = shipCells(origin, orientation, spec.size)
  const ship: Ship = {
    spec,
    origin,
    orientation,
    cells,
    hits: cells.map(() => false),
  }
  return { ...board, ships: [...board.ships, ship] }
}

export function removeShip(board: Board, shipId: string): Board {
  return { ...board, ships: board.ships.filter((s) => s.spec.id !== shipId) }
}

export function isSunk(ship: Ship): boolean {
  return ship.hits.every(Boolean)
}

export function shipAt(board: Board, coord: Coord): Ship | undefined {
  return board.ships.find((s) => s.cells.some((c) => c.row === coord.row && c.col === coord.col))
}

export function fireAt(board: Board, coord: Coord): ShotOutcome {
  if (!inBounds(coord, board.size) || board.shots[coord.row][coord.col] !== 'empty') {
    return { board, result: 'invalid', coord, fleetDestroyed: false }
  }

  const target = shipAt(board, coord)
  const shots = board.shots.map((row) => [...row])

  if (!target) {
    shots[coord.row][coord.col] = 'miss'
    return { board: { ...board, shots }, result: 'miss', coord, fleetDestroyed: false }
  }

  const hitIndex = target.cells.findIndex((c) => c.row === coord.row && c.col === coord.col)
  const updatedShip: Ship = {
    ...target,
    hits: target.hits.map((h, i) => (i === hitIndex ? true : h)),
  }
  const ships = board.ships.map((s) => (s.spec.id === target.spec.id ? updatedShip : s))
  const sunk = isSunk(updatedShip)

  shots[coord.row][coord.col] = 'hit'
  if (sunk) {
    for (const c of updatedShip.cells) shots[c.row][c.col] = 'sunk'
  }

  const nextBoard: Board = { ...board, ships, shots }
  return {
    board: nextBoard,
    result: sunk ? 'sunk' : 'hit',
    ship: updatedShip,
    coord,
    fleetDestroyed: allSunk(nextBoard),
  }
}

export function allSunk(board: Board): boolean {
  return board.ships.length > 0 && board.ships.every(isSunk)
}

export function randomPlacement(
  fleet: ShipSpec[],
  size: number = BOARD_SIZE,
  rng: () => number = Math.random,
): Board {
  // Largest ships first: they have the fewest legal spots once spacing applies.
  const order = [...fleet].sort((a, b) => b.size - a.size)
  for (let attempt = 0; attempt < 400; attempt++) {
    let board = createBoard(size)
    let ok = true
    for (const spec of order) {
      const options: { origin: Coord; orientation: Orientation }[] = []
      for (const orientation of ['horizontal', 'vertical'] as Orientation[]) {
        const maxRow = orientation === 'vertical' ? size - spec.size : size - 1
        const maxCol = orientation === 'horizontal' ? size - spec.size : size - 1
        for (let row = 0; row <= maxRow; row++) {
          for (let col = 0; col <= maxCol; col++) {
            const origin = { row, col }
            if (!validatePlacement(board, spec, origin, orientation)) {
              options.push({ origin, orientation })
            }
          }
        }
      }
      if (options.length === 0) {
        ok = false
        break
      }
      const pick = options[Math.floor(rng() * options.length)]
      board = placeShip(board, spec, pick.origin, pick.orientation)
    }
    if (ok) return board
  }
  throw new Error('Could not place fleet; try a smaller fleet or larger board.')
}

export function coordLabel(coord: Coord): string {
  return `${String.fromCharCode(65 + coord.col)}${coord.row + 1}`
}
