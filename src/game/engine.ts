import { allSunk, coordLabel, createBoard, fireAt, placeShip, randomPlacement, removeShip, validatePlacement } from './board'
import { chooseShot, viewOf, type Difficulty } from './ai'
import {
  BOARD_SIZE,
  DEFAULT_FLEET,
  type Board,
  type Coord,
  type Orientation,
  type ShipSpec,
} from './types'

export type Phase = 'setup' | 'battle' | 'over'
export type Side = 'player' | 'ai'

/** The most recent resolved shot, used to drive board animations and sound. */
export type ShotEvent = {
  seq: number
  side: Side
  coord: Coord
  result: 'miss' | 'hit' | 'sunk'
  /** Name of the ship destroyed by this shot, set only when result is 'sunk'. */
  shipName?: string
}

export type Stats = {
  shots: number
  hits: number
}

export type GameState = {
  phase: Phase
  difficulty: Difficulty
  fleet: ShipSpec[]
  playerBoard: Board
  aiBoard: Board
  turn: Side
  /** Set while the AI's reply is pending so the UI can lock input. */
  awaitingAi: boolean
  stats: Record<Side, Stats>
  winner: Side | null
  selectedShipId: string | null
  orientation: Orientation
  message: string
  lastShot: Record<Side, ShotEvent | null>
  history: ShotEvent[]
}

export type Action =
  | { type: 'set-difficulty'; difficulty: Difficulty }
  | { type: 'set-fleet'; fleet: ShipSpec[] }
  | { type: 'select-ship'; shipId: string | null }
  | { type: 'rotate' }
  | { type: 'place-ship'; coord: Coord }
  | { type: 'remove-ship'; shipId: string }
  | { type: 'randomize' }
  | { type: 'clear' }
  | { type: 'start-battle' }
  | { type: 'player-fire'; coord: Coord }
  | { type: 'ai-turn' }
  | { type: 'play-again' }
  | { type: 'new-setup' }

let shotSeq = 0

const CROWDED = 'That fleet is too crowded for a 10x10 board — remove a ship.'

function safeRandom(fleet: ShipSpec[]): Board | null {
  try {
    return randomPlacement(fleet, BOARD_SIZE)
  } catch {
    return null
  }
}

export function initialState(fleet: ShipSpec[] = DEFAULT_FLEET): GameState {
  return {
    phase: 'setup',
    difficulty: 'medium',
    fleet,
    playerBoard: createBoard(BOARD_SIZE),
    aiBoard: createBoard(BOARD_SIZE),
    turn: 'player',
    awaitingAi: false,
    stats: { player: { shots: 0, hits: 0 }, ai: { shots: 0, hits: 0 } },
    winner: null,
    selectedShipId: fleet[0]?.id ?? null,
    orientation: 'horizontal',
    message: 'Place your fleet to begin.',
    lastShot: { player: null, ai: null },
    history: [],
  }
}

export function unplacedShips(state: GameState): ShipSpec[] {
  const placed = new Set(state.playerBoard.ships.map((s) => s.spec.id))
  return state.fleet.filter((s) => !placed.has(s.id))
}

function nextSelection(state: GameState, board: Board): string | null {
  const placed = new Set(board.ships.map((s) => s.spec.id))
  return state.fleet.find((s) => !placed.has(s.id))?.id ?? null
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'set-difficulty':
      return { ...state, difficulty: action.difficulty }

    case 'set-fleet': {
      const fleet = action.fleet
      return {
        ...initialState(fleet),
        difficulty: state.difficulty,
      }
    }

    case 'select-ship':
      return { ...state, selectedShipId: action.shipId }

    case 'rotate':
      return {
        ...state,
        orientation: state.orientation === 'horizontal' ? 'vertical' : 'horizontal',
      }

    case 'place-ship': {
      if (state.phase !== 'setup' || !state.selectedShipId) return state
      const spec = state.fleet.find((s) => s.id === state.selectedShipId)
      if (!spec) return state
      const error = validatePlacement(state.playerBoard, spec, action.coord, state.orientation)
      if (error) {
        const reason: Record<typeof error, string> = {
          overlap: `${spec.name} would overlap another ship.`,
          adjacent: `Ships cannot touch — leave a gap around the ${spec.name}.`,
          'out-of-bounds': `${spec.name} does not fit there.`,
          'duplicate-ship': `${spec.name} is already placed.`,
        }
        return { ...state, message: reason[error] }
      }
      const playerBoard = placeShip(state.playerBoard, spec, action.coord, state.orientation)
      const selectedShipId = nextSelection(state, playerBoard)
      return {
        ...state,
        playerBoard,
        selectedShipId,
        message: selectedShipId
          ? `${spec.name} placed. Next: ${state.fleet.find((s) => s.id === selectedShipId)?.name}.`
          : 'Fleet ready. Start the battle!',
      }
    }

    case 'remove-ship': {
      if (state.phase !== 'setup') return state
      const playerBoard = removeShip(state.playerBoard, action.shipId)
      return { ...state, playerBoard, selectedShipId: action.shipId }
    }

    case 'randomize': {
      if (state.phase !== 'setup') return state
      const playerBoard = safeRandom(state.fleet)
      if (!playerBoard) return { ...state, message: CROWDED }
      return {
        ...state,
        playerBoard,
        selectedShipId: null,
        message: 'Fleet ready. Start the battle!',
      }
    }

    case 'clear': {
      if (state.phase !== 'setup') return state
      return {
        ...state,
        playerBoard: createBoard(BOARD_SIZE),
        selectedShipId: state.fleet[0]?.id ?? null,
        message: 'Place your fleet to begin.',
      }
    }

    case 'start-battle': {
      if (state.phase !== 'setup' || unplacedShips(state).length > 0) return state
      const aiBoard = safeRandom(state.fleet)
      if (!aiBoard) return { ...state, message: CROWDED }
      return {
        ...state,
        phase: 'battle',
        aiBoard,
        turn: 'player',
        message: 'Battle stations! Fire at the enemy waters.',
      }
    }

    case 'player-fire': {
      if (state.phase !== 'battle' || state.turn !== 'player' || state.awaitingAi) return state
      const outcome = fireAt(state.aiBoard, action.coord)
      if (outcome.result === 'invalid') return state
      const label = coordLabel(action.coord)
      const hit = outcome.result !== 'miss'
      const text =
        outcome.result === 'sunk'
          ? `${label} — you sank the enemy ${outcome.ship!.spec.name}!`
          : outcome.result === 'hit'
            ? `${label} — hit!`
            : `${label} — miss.`
      const event: ShotEvent = {
        seq: ++shotSeq,
        side: 'player',
        coord: action.coord,
        result: outcome.result,
        ...(outcome.result === 'sunk' ? { shipName: outcome.ship!.spec.name } : {}),
      }
      const stats = {
        ...state.stats,
        player: {
          shots: state.stats.player.shots + 1,
          hits: state.stats.player.hits + (hit ? 1 : 0),
        },
      }
      if (outcome.fleetDestroyed) {
        return {
          ...state,
          aiBoard: outcome.board,
          stats,
          phase: 'over',
          winner: 'player',
          message: 'Victory! The enemy fleet is destroyed.',
          lastShot: { ...state.lastShot, player: event },
          history: [...state.history, event],
        }
      }
      return {
        ...state,
        aiBoard: outcome.board,
        stats,
        turn: 'ai',
        awaitingAi: true,
        message: text,
        lastShot: { ...state.lastShot, player: event },
        history: [...state.history, event],
      }
    }

    case 'ai-turn': {
      if (state.phase !== 'battle' || state.turn !== 'ai') return state
      const coord = chooseShot(state.difficulty, viewOf(state.playerBoard))
      if (!coord) return { ...state, turn: 'player', awaitingAi: false }
      const outcome = fireAt(state.playerBoard, coord)
      if (outcome.result === 'invalid') return { ...state, turn: 'player', awaitingAi: false }
      const label = coordLabel(coord)
      const hit = outcome.result !== 'miss'
      const text =
        outcome.result === 'sunk'
          ? `Enemy hit ${label} and sank your ${outcome.ship!.spec.name}!`
          : outcome.result === 'hit'
            ? `Enemy hit your ship at ${label}.`
            : `Enemy missed at ${label}.`
      const event: ShotEvent = {
        seq: ++shotSeq,
        side: 'ai',
        coord,
        result: outcome.result,
        ...(outcome.result === 'sunk' ? { shipName: outcome.ship!.spec.name } : {}),
      }
      const stats = {
        ...state.stats,
        ai: { shots: state.stats.ai.shots + 1, hits: state.stats.ai.hits + (hit ? 1 : 0) },
      }
      if (outcome.fleetDestroyed) {
        return {
          ...state,
          playerBoard: outcome.board,
          stats,
          phase: 'over',
          winner: 'ai',
          awaitingAi: false,
          lastShot: { ...state.lastShot, ai: event },
          history: [...state.history, event],
          message: 'Defeat — your fleet has been sunk.',
        }
      }
      return {
        ...state,
        playerBoard: outcome.board,
        stats,
        turn: 'player',
        awaitingAi: false,
        lastShot: { ...state.lastShot, ai: event },
        history: [...state.history, event],
        message: `${text} Your move.`,
      }
    }

    case 'play-again': {
      const fresh = initialState(state.fleet)
      const playerBoard = safeRandom(state.fleet)
      return {
        ...fresh,
        difficulty: state.difficulty,
        playerBoard: playerBoard ?? fresh.playerBoard,
        phase: 'setup',
        selectedShipId: playerBoard ? null : fresh.selectedShipId,
        message: 'Same fleet, new positions. Adjust or start the battle.',
      }
    }

    case 'new-setup':
      return { ...initialState(state.fleet), difficulty: state.difficulty }

    default:
      return state
  }
}

export function accuracy(stats: Stats): number {
  return stats.shots === 0 ? 0 : Math.round((stats.hits / stats.shots) * 100)
}

export function isFleetDestroyed(board: Board): boolean {
  return allSunk(board)
}
