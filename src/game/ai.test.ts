import { describe, expect, it } from 'vitest'
import { chooseShot, viewOf, type Difficulty } from './ai'
import { createBoard, fireAt, placeShip, randomPlacement } from './board'
import { DEFAULT_FLEET, type Board } from './types'

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Plays a full game against a random fleet and returns the shots needed. */
function playGame(difficulty: Difficulty, rng: () => number): number {
  let board: Board = randomPlacement(DEFAULT_FLEET, 10, rng)
  let shots = 0
  while (shots < 100) {
    const coord = chooseShot(difficulty, viewOf(board), rng)
    if (!coord) break
    const outcome = fireAt(board, coord)
    expect(outcome.result).not.toBe('invalid')
    board = outcome.board
    shots++
    if (outcome.fleetDestroyed) break
  }
  return shots
}

function average(difficulty: Difficulty, games: number): number {
  const rng = mulberry32(1234)
  let total = 0
  for (let i = 0; i < games; i++) total += playGame(difficulty, rng)
  return total / games
}

describe('AI shot selection', () => {
  it('never repeats a shot and always finishes the fleet', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as Difficulty[]) {
      const rng = mulberry32(7)
      expect(playGame(difficulty, rng)).toBeLessThanOrEqual(100)
    }
  })

  it('returns null when the board is fully shot', () => {
    let board = createBoard(3)
    board = placeShip(board, { id: 'd', name: 'D', size: 2 }, { row: 0, col: 0 }, 'horizontal')
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) board = fireAt(board, { row, col }).board
    }
    expect(chooseShot('hard', viewOf(board))).toBeNull()
  })

  it('targets a cell adjacent to an unresolved hit', () => {
    let board = placeShip(createBoard(10), { id: 'c', name: 'C', size: 3 }, { row: 4, col: 4 }, 'horizontal')
    board = fireAt(board, { row: 4, col: 5 }).board
    for (const difficulty of ['medium', 'hard'] as Difficulty[]) {
      const shot = chooseShot(difficulty, viewOf(board), mulberry32(3))!
      const adjacent =
        (shot.row === 4 && Math.abs(shot.col - 5) === 1) ||
        (shot.col === 5 && Math.abs(shot.row - 4) === 1)
      expect(adjacent).toBe(true)
    }
  })

  it('extends along the axis once two hits line up', () => {
    let board = placeShip(createBoard(10), { id: 'c', name: 'C', size: 4 }, { row: 4, col: 3 }, 'horizontal')
    board = fireAt(board, { row: 4, col: 4 }).board
    board = fireAt(board, { row: 4, col: 5 }).board
    for (const difficulty of ['medium', 'hard'] as Difficulty[]) {
      const shot = chooseShot(difficulty, viewOf(board), mulberry32(9))!
      expect(shot.row).toBe(4)
      expect([3, 6]).toContain(shot.col)
    }
  })

  it('never fires at a cell it has already shot', () => {
    let board = randomPlacement(DEFAULT_FLEET, 10, mulberry32(21))
    const rng = mulberry32(22)
    const seen = new Set<string>()
    for (let i = 0; i < 60; i++) {
      const shot = chooseShot('hard', viewOf(board), rng)!
      const k = `${shot.row},${shot.col}`
      expect(seen.has(k)).toBe(false)
      seen.add(k)
      board = fireAt(board, shot).board
    }
  })

  it('gets stronger as difficulty increases', () => {
    const easy = average('easy', 40)
    const medium = average('medium', 40)
    const hard = average('hard', 40)
    expect(medium).toBeLessThan(easy)
    expect(hard).toBeLessThan(medium)
    expect(hard).toBeLessThan(60)
  })
})
