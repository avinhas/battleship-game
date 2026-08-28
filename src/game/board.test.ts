import { describe, expect, it } from 'vitest'
import {
  allSunk,
  coordLabel,
  createBoard,
  fireAt,
  placeShip,
  randomPlacement,
  removeShip,
  shipCells,
  validatePlacement,
} from './board'
import { DEFAULT_FLEET, EXTRA_SHIPS, type ShipSpec } from './types'

const destroyer: ShipSpec = { id: 'destroyer', name: 'Destroyer', size: 2 }
const cruiser: ShipSpec = { id: 'cruiser', name: 'Cruiser', size: 3 }

describe('board geometry', () => {
  it('creates an empty board of the requested size', () => {
    const board = createBoard(10)
    expect(board.shots).toHaveLength(10)
    expect(board.shots.every((row) => row.length === 10 && row.every((c) => c === 'empty'))).toBe(true)
  })

  it('computes ship cells for both orientations', () => {
    expect(shipCells({ row: 2, col: 3 }, 'horizontal', 3)).toEqual([
      { row: 2, col: 3 },
      { row: 2, col: 4 },
      { row: 2, col: 5 },
    ])
    expect(shipCells({ row: 2, col: 3 }, 'vertical', 2)).toEqual([
      { row: 2, col: 3 },
      { row: 3, col: 3 },
    ])
  })

  it('labels coordinates like A1 and J10', () => {
    expect(coordLabel({ row: 0, col: 0 })).toBe('A1')
    expect(coordLabel({ row: 9, col: 9 })).toBe('J10')
  })
})

describe('placement validation', () => {
  it('rejects placements that run off the board', () => {
    const board = createBoard(10)
    expect(validatePlacement(board, cruiser, { row: 0, col: 8 }, 'horizontal')).toBe('out-of-bounds')
    expect(validatePlacement(board, cruiser, { row: 8, col: 0 }, 'vertical')).toBe('out-of-bounds')
    expect(validatePlacement(board, cruiser, { row: 0, col: 7 }, 'horizontal')).toBeNull()
  })

  it('rejects overlapping ships and duplicates', () => {
    const board = placeShip(createBoard(10), cruiser, { row: 4, col: 4 }, 'horizontal')
    expect(validatePlacement(board, destroyer, { row: 4, col: 5 }, 'vertical')).toBe('overlap')
    expect(validatePlacement(board, cruiser, { row: 0, col: 0 }, 'horizontal')).toBe('duplicate-ship')
    expect(validatePlacement(board, destroyer, { row: 7, col: 7 }, 'vertical')).toBeNull()
  })

  it('rejects ships that touch, including diagonally', () => {
    const board = placeShip(createBoard(10), cruiser, { row: 4, col: 4 }, 'horizontal')
    expect(validatePlacement(board, destroyer, { row: 5, col: 4 }, 'horizontal')).toBe('adjacent')
    expect(validatePlacement(board, destroyer, { row: 4, col: 7 }, 'horizontal')).toBe('adjacent')
    expect(validatePlacement(board, destroyer, { row: 3, col: 7 }, 'vertical')).toBe('adjacent')
    expect(validatePlacement(board, destroyer, { row: 6, col: 4 }, 'horizontal')).toBeNull()
    expect(validatePlacement(board, destroyer, { row: 4, col: 8 }, 'horizontal')).toBeNull()
  })

  it('placeShip throws on invalid placement and removeShip undoes it', () => {
    const board = placeShip(createBoard(10), cruiser, { row: 0, col: 0 }, 'horizontal')
    expect(() => placeShip(board, destroyer, { row: 0, col: 1 }, 'horizontal')).toThrow()
    expect(removeShip(board, 'cruiser').ships).toHaveLength(0)
  })

  it('does not mutate the input board', () => {
    const board = createBoard(10)
    placeShip(board, cruiser, { row: 0, col: 0 }, 'horizontal')
    expect(board.ships).toHaveLength(0)
  })
})

describe('firing', () => {
  it('records misses', () => {
    const board = placeShip(createBoard(10), destroyer, { row: 0, col: 0 }, 'horizontal')
    const outcome = fireAt(board, { row: 5, col: 5 })
    expect(outcome.result).toBe('miss')
    expect(outcome.board.shots[5][5]).toBe('miss')
  })

  it('records hits and sinks, marking every cell of the sunk ship', () => {
    let board = placeShip(createBoard(10), destroyer, { row: 0, col: 0 }, 'horizontal')
    const first = fireAt(board, { row: 0, col: 0 })
    expect(first.result).toBe('hit')
    expect(first.fleetDestroyed).toBe(false)
    board = first.board
    const second = fireAt(board, { row: 0, col: 1 })
    expect(second.result).toBe('sunk')
    expect(second.ship?.spec.id).toBe('destroyer')
    expect(second.board.shots[0][0]).toBe('sunk')
    expect(second.board.shots[0][1]).toBe('sunk')
    expect(second.fleetDestroyed).toBe(true)
    expect(allSunk(second.board)).toBe(true)
  })

  it('rejects repeat shots and out-of-bounds shots', () => {
    const board = fireAt(createBoard(10), { row: 1, col: 1 }).board
    expect(fireAt(board, { row: 1, col: 1 }).result).toBe('invalid')
    expect(fireAt(board, { row: -1, col: 0 }).result).toBe('invalid')
    expect(fireAt(board, { row: 0, col: 10 }).result).toBe('invalid')
  })

  it('treats an empty board as not destroyed', () => {
    expect(allSunk(createBoard(10))).toBe(false)
  })
})

describe('random placement', () => {
  it('places the whole fleet without overlaps, repeatedly', () => {
    for (let i = 0; i < 200; i++) {
      const board = randomPlacement(DEFAULT_FLEET, 10)
      expect(board.ships).toHaveLength(DEFAULT_FLEET.length)
      const cells = board.ships.flatMap((s) => s.cells)
      expect(new Set(cells.map((c) => `${c.row},${c.col}`)).size).toBe(cells.length)
      expect(cells.every((c) => c.row >= 0 && c.row < 10 && c.col >= 0 && c.col < 10)).toBe(true)
    }
  })

  it('never places two ships touching, diagonals included', () => {
    for (let i = 0; i < 200; i++) {
      const board = randomPlacement([...DEFAULT_FLEET, ...EXTRA_SHIPS.slice(0, 1)], 10)
      for (const ship of board.ships) {
        const others = board.ships.filter((s) => s.spec.id !== ship.spec.id).flatMap((s) => s.cells)
        for (const cell of ship.cells) {
          for (const other of others) {
            const touching =
              Math.abs(cell.row - other.row) <= 1 && Math.abs(cell.col - other.col) <= 1
            expect(touching).toBe(false)
          }
        }
      }
    }
  })

  it('throws when the fleet cannot fit', () => {
    const impossible = Array.from({ length: 10 }, (_, i) => ({
      id: `big${i}`,
      name: 'Big',
      size: 4,
    }))
    expect(() => randomPlacement(impossible, 4)).toThrow()
  })
})
