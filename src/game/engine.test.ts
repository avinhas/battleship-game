import { describe, expect, it } from 'vitest'
import { accuracy, initialState, reducer, unplacedShips, type GameState } from './engine'
import { DEFAULT_FLEET } from './types'

function setupReady(): GameState {
  let state = initialState()
  state = reducer(state, { type: 'randomize' })
  return reducer(state, { type: 'start-battle' })
}

describe('setup phase', () => {
  it('starts with the whole fleet unplaced and the first ship selected', () => {
    const state = initialState()
    expect(unplacedShips(state)).toHaveLength(DEFAULT_FLEET.length)
    expect(state.selectedShipId).toBe(DEFAULT_FLEET[0].id)
    expect(state.phase).toBe('setup')
  })

  it('places the selected ship and advances the selection', () => {
    const state = reducer(initialState(), { type: 'place-ship', coord: { row: 0, col: 0 } })
    expect(state.playerBoard.ships).toHaveLength(1)
    expect(state.selectedShipId).toBe(DEFAULT_FLEET[1].id)
  })

  it('explains why an invalid placement was refused', () => {
    let state = reducer(initialState(), { type: 'place-ship', coord: { row: 0, col: 8 } })
    expect(state.playerBoard.ships).toHaveLength(0)
    expect(state.message).toMatch(/does not fit/i)

    state = reducer(initialState(), { type: 'place-ship', coord: { row: 0, col: 0 } })
    state = reducer(state, { type: 'place-ship', coord: { row: 0, col: 1 } })
    expect(state.message).toMatch(/overlap/i)

    state = reducer(initialState(), { type: 'place-ship', coord: { row: 0, col: 0 } })
    state = reducer(state, { type: 'place-ship', coord: { row: 1, col: 5 } })
    expect(state.message).toMatch(/cannot touch/i)
    expect(state.playerBoard.ships).toHaveLength(1)
  })

  it('rotates the placement orientation', () => {
    const state = reducer(initialState(), { type: 'rotate' })
    expect(state.orientation).toBe('vertical')
    expect(reducer(state, { type: 'rotate' }).orientation).toBe('horizontal')
  })

  it('randomize fills the fleet, clear empties it, and removal frees a ship', () => {
    let state = reducer(initialState(), { type: 'randomize' })
    expect(unplacedShips(state)).toHaveLength(0)
    state = reducer(state, { type: 'remove-ship', shipId: DEFAULT_FLEET[0].id })
    expect(unplacedShips(state)).toHaveLength(1)
    expect(state.selectedShipId).toBe(DEFAULT_FLEET[0].id)
    state = reducer(state, { type: 'clear' })
    expect(state.playerBoard.ships).toHaveLength(0)
  })

  it('refuses to start the battle until the fleet is placed', () => {
    const state = reducer(initialState(), { type: 'start-battle' })
    expect(state.phase).toBe('setup')
    expect(setupReady().phase).toBe('battle')
  })

  it('changing the fleet resets placement but keeps difficulty', () => {
    let state = reducer(initialState(), { type: 'set-difficulty', difficulty: 'hard' })
    state = reducer(state, { type: 'randomize' })
    state = reducer(state, { type: 'set-fleet', fleet: DEFAULT_FLEET.slice(0, 2) })
    expect(state.difficulty).toBe('hard')
    expect(state.playerBoard.ships).toHaveLength(0)
    expect(state.fleet).toHaveLength(2)
  })
})

describe('battle phase', () => {
  it('gives the AI a full fleet and hands the first turn to the player', () => {
    const state = setupReady()
    expect(state.aiBoard.ships).toHaveLength(DEFAULT_FLEET.length)
    expect(state.turn).toBe('player')
  })

  it('records the player shot, logs it, and passes the turn', () => {
    const state = reducer(setupReady(), { type: 'player-fire', coord: { row: 0, col: 0 } })
    expect(state.stats.player.shots).toBe(1)
    expect(state.turn).toBe('ai')
    expect(state.awaitingAi).toBe(true)
    expect(state.message).toMatch(/^A1 —/)
    expect(state.lastShot.player).toMatchObject({ side: 'player', coord: { row: 0, col: 0 } })
  })

  it('ignores clicks on an already-shot cell and out-of-turn shots', () => {
    const first = reducer(setupReady(), { type: 'player-fire', coord: { row: 0, col: 0 } })
    const again = reducer(first, { type: 'player-fire', coord: { row: 1, col: 1 } })
    expect(again).toBe(first)
    const resolved = reducer(first, { type: 'ai-turn' })
    const repeat = reducer(resolved, { type: 'player-fire', coord: { row: 0, col: 0 } })
    expect(repeat).toBe(resolved)
  })

  it('lets the AI take its turn and hands control back', () => {
    let state = reducer(setupReady(), { type: 'player-fire', coord: { row: 0, col: 0 } })
    state = reducer(state, { type: 'ai-turn' })
    expect(state.stats.ai.shots).toBe(1)
    expect(state.turn).toBe('player')
    expect(state.awaitingAi).toBe(false)
    expect(state.lastShot.ai).not.toBeNull()
    expect(state.lastShot.ai!.seq).toBeGreaterThan(state.lastShot.player!.seq)
  })

  it('ends the game when a fleet is wiped out', () => {
    let state = setupReady()
    for (const ship of state.aiBoard.ships) {
      for (const cell of ship.cells) {
        if (state.phase !== 'battle') break
        state = reducer(state, { type: 'player-fire', coord: cell })
        if (state.phase === 'battle') state = reducer(state, { type: 'ai-turn' })
      }
    }
    expect(state.phase).toBe('over')
    expect(state.winner).toBe('player')
    expect(state.message).toMatch(/victory/i)
  })

  it('freezes the game once it is over', () => {
    let state = setupReady()
    state = { ...state, phase: 'over', winner: 'player' }
    expect(reducer(state, { type: 'player-fire', coord: { row: 5, col: 5 } })).toBe(state)
  })
})

describe('restarting', () => {
  it('play again keeps the fleet and difficulty but resets the boards', () => {
    let state = reducer(setupReady(), { type: 'set-difficulty', difficulty: 'hard' })
    state = reducer(state, { type: 'player-fire', coord: { row: 3, col: 3 } })
    const next = reducer(state, { type: 'play-again' })
    expect(next.phase).toBe('setup')
    expect(next.difficulty).toBe('hard')
    expect(next.stats.player.shots).toBe(0)
    expect(unplacedShips(next)).toHaveLength(0)
  })

  it('new setup clears placement too', () => {
    const next = reducer(setupReady(), { type: 'new-setup' })
    expect(next.playerBoard.ships).toHaveLength(0)
  })
})

describe('stats', () => {
  it('computes accuracy safely', () => {
    expect(accuracy({ shots: 0, hits: 0 })).toBe(0)
    expect(accuracy({ shots: 4, hits: 1 })).toBe(25)
  })
})
