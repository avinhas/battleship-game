export const BOARD_SIZE = 10

export type Orientation = 'horizontal' | 'vertical'

export type Coord = { row: number; col: number }

export type ShipId = string

export type ShipSpec = {
  id: ShipId
  name: string
  size: number
}

export type Ship = {
  spec: ShipSpec
  origin: Coord
  orientation: Orientation
  cells: Coord[]
  hits: boolean[]
}

export type CellState = 'empty' | 'miss' | 'hit' | 'sunk'

export type Board = {
  size: number
  ships: Ship[]
  shots: CellState[][]
}

export type ShotOutcome = {
  board: Board
  result: 'miss' | 'hit' | 'sunk' | 'invalid'
  ship?: Ship
  coord: Coord
  fleetDestroyed: boolean
}

export const DEFAULT_FLEET: ShipSpec[] = [
  { id: 'carrier', name: 'Carrier', size: 5 },
  { id: 'battleship', name: 'Battleship', size: 4 },
  { id: 'cruiser', name: 'Cruiser', size: 3 },
  { id: 'submarine', name: 'Submarine', size: 3 },
  { id: 'destroyer', name: 'Destroyer', size: 2 },
]

export const EXTRA_SHIPS: ShipSpec[] = [
  { id: 'patrol', name: 'Patrol Boat', size: 2 },
  { id: 'corvette', name: 'Corvette', size: 3 },
  { id: 'dreadnought', name: 'Dreadnought', size: 6 },
]
