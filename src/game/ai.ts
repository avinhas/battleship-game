import { type Board, type CellState, type Coord } from './types'
import { isSunk } from './board'

export type Difficulty = 'easy' | 'medium' | 'hard'

/**
 * What the shooter is allowed to know about the target board: the grid of
 * previous shot results only. 'sunk' cells are public knowledge because the
 * defender announces which ship went down.
 */
export type BoardView = {
  size: number
  shots: CellState[][]
  /** Sizes of ships that have not been sunk yet. */
  remainingSizes: number[]
}

export function viewOf(board: Board): BoardView {
  return {
    size: board.size,
    shots: board.shots,
    remainingSizes: board.ships.filter((s) => !isSunk(s)).map((s) => s.spec.size),
  }
}

function openCells(view: BoardView): Coord[] {
  const cells: Coord[] = []
  for (let row = 0; row < view.size; row++) {
    for (let col = 0; col < view.size; col++) {
      if (view.shots[row][col] === 'empty') cells.push({ row, col })
    }
  }
  return cells
}

/** Hits belonging to ships that are still afloat. */
function activeHits(view: BoardView): Coord[] {
  const hits: Coord[] = []
  for (let row = 0; row < view.size; row++) {
    for (let col = 0; col < view.size; col++) {
      if (view.shots[row][col] === 'hit') hits.push({ row, col })
    }
  }
  return hits
}

function isOpen(view: BoardView, row: number, col: number): boolean {
  return (
    row >= 0 && row < view.size && col >= 0 && col < view.size && view.shots[row][col] === 'empty'
  )
}

function isHit(view: BoardView, row: number, col: number): boolean {
  return row >= 0 && row < view.size && col >= 0 && col < view.size && view.shots[row][col] === 'hit'
}

function pick(cells: Coord[], rng: () => number): Coord {
  return cells[Math.floor(rng() * cells.length)]
}

/**
 * Candidate follow-up shots around known hits. When two hits line up, only
 * cells extending that line are considered.
 */
function targetCandidates(view: BoardView): Coord[] {
  const hits = activeHits(view)
  if (hits.length === 0) return []

  const lineCandidates: Coord[] = []
  for (const { row, col } of hits) {
    if (isHit(view, row, col - 1) || isHit(view, row, col + 1)) {
      let left = col
      while (isHit(view, row, left - 1)) left--
      let right = col
      while (isHit(view, row, right + 1)) right++
      if (isOpen(view, row, left - 1)) lineCandidates.push({ row, col: left - 1 })
      if (isOpen(view, row, right + 1)) lineCandidates.push({ row, col: right + 1 })
    }
    if (isHit(view, row - 1, col) || isHit(view, row + 1, col)) {
      let top = row
      while (isHit(view, top - 1, col)) top--
      let bottom = row
      while (isHit(view, bottom + 1, col)) bottom++
      if (isOpen(view, top - 1, col)) lineCandidates.push({ row: top - 1, col })
      if (isOpen(view, bottom + 1, col)) lineCandidates.push({ row: bottom + 1, col })
    }
  }
  if (lineCandidates.length > 0) return dedupe(lineCandidates)

  const neighbours: Coord[] = []
  for (const { row, col } of hits) {
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      if (isOpen(view, row + dr, col + dc)) neighbours.push({ row: row + dr, col: col + dc })
    }
  }
  return dedupe(neighbours)
}

function dedupe(cells: Coord[]): Coord[] {
  const seen = new Set<string>()
  return cells.filter((c) => {
    const k = `${c.row},${c.col}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/**
 * Counts, for every open cell, how many placements of the remaining ships
 * would cover it. Placements that would overlap a miss or a sunk ship are
 * impossible; placements covering an unresolved hit are weighted heavily
 * because the ship there is known to be afloat.
 */
export function probabilityMap(view: BoardView): number[][] {
  const scores = Array.from({ length: view.size }, () => Array<number>(view.size).fill(0))
  const blocked = (row: number, col: number) =>
    view.shots[row][col] === 'miss' || view.shots[row][col] === 'sunk'

  for (const size of new Set(view.remainingSizes)) {
    const count = view.remainingSizes.filter((s) => s === size).length
    for (let row = 0; row < view.size; row++) {
      for (let col = 0; col < view.size; col++) {
        for (const [dr, dc] of [
          [0, 1],
          [1, 0],
        ]) {
          const cells: Coord[] = []
          let fits = true
          for (let i = 0; i < size; i++) {
            const r = row + dr * i
            const c = col + dc * i
            if (r >= view.size || c >= view.size || blocked(r, c)) {
              fits = false
              break
            }
            cells.push({ row: r, col: c })
          }
          if (!fits) continue
          const hitsCovered = cells.filter((c) => view.shots[c.row][c.col] === 'hit').length
          const weight = count * (hitsCovered > 0 ? 50 * hitsCovered : 1)
          for (const c of cells) {
            if (view.shots[c.row][c.col] === 'empty') scores[c.row][c.col] += weight
          }
        }
      }
    }
  }
  return scores
}

function bestByScore(view: BoardView, scores: number[][], rng: () => number): Coord | null {
  let best = 0
  let bestCells: Coord[] = []
  for (const cell of openCells(view)) {
    const score = scores[cell.row][cell.col]
    if (score > best) {
      best = score
      bestCells = [cell]
    } else if (score === best && score > 0) {
      bestCells.push(cell)
    }
  }
  return bestCells.length > 0 ? pick(bestCells, rng) : null
}

/** Cells that could still hold the smallest remaining ship (parity hunting). */
function parityCells(view: BoardView): Coord[] {
  const smallest = Math.min(...view.remainingSizes)
  if (!Number.isFinite(smallest) || smallest < 2) return openCells(view)
  return openCells(view).filter((c) => (c.row + c.col) % smallest === 0)
}

export function chooseShot(
  difficulty: Difficulty,
  view: BoardView,
  rng: () => number = Math.random,
): Coord | null {
  const open = openCells(view)
  if (open.length === 0) return null

  if (difficulty === 'easy') return pick(open, rng)

  const targets = targetCandidates(view)
  if (targets.length > 0) {
    if (difficulty === 'medium') return pick(targets, rng)
    const scores = probabilityMap(view)
    let best = targets[0]
    let bestScore = -1
    for (const cell of targets) {
      const score = scores[cell.row][cell.col]
      if (score > bestScore) {
        bestScore = score
        best = cell
      }
    }
    return best
  }

  if (difficulty === 'medium') {
    const candidates = parityCells(view)
    return pick(candidates.length > 0 ? candidates : open, rng)
  }

  return bestByScore(view, probabilityMap(view), rng) ?? pick(open, rng)
}
