import { useEffect, useReducer } from 'react'
import { BoardGrid } from './components/BoardGrid'
import { FleetPanel } from './components/FleetPanel'
import { GameOver } from './components/GameOver'
import { MoveLog } from './components/MoveLog'
import { SettingsBar } from './components/SettingsBar'
import { initialState, reducer, unplacedShips } from './game/engine'
import './App.css'

const AI_DELAY_MS = 650

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState())

  useEffect(() => {
    if (!state.awaitingAi) return
    const timer = setTimeout(() => dispatch({ type: 'ai-turn' }), AI_DELAY_MS)
    return () => clearTimeout(timer)
  }, [state.awaitingAi])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'r' && state.phase === 'setup') {
        dispatch({ type: 'rotate' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.phase])

  const setup = state.phase === 'setup'
  const selectedShip = state.fleet.find((s) => s.id === state.selectedShipId) ?? null
  const remaining = unplacedShips(state)

  return (
    <div className="app">
      <header className="app-header">
        <h1>Battleship</h1>
        <p className="tagline">
          {setup ? 'Deploy your fleet' : state.phase === 'battle' ? 'Battle in progress' : 'Game over'}
        </p>
      </header>

      <p className={`status status-${state.phase}`} role="status">
        {state.message}
      </p>

      {setup && (
        <SettingsBar
          difficulty={state.difficulty}
          onDifficulty={(difficulty) => dispatch({ type: 'set-difficulty', difficulty })}
          fleet={state.fleet}
          onFleet={(fleet) => dispatch({ type: 'set-fleet', fleet })}
          locked={!setup}
        />
      )}

      {setup && (
        <div className="setup-controls">
          <button type="button" onClick={() => dispatch({ type: 'rotate' })}>
            Rotate ({state.orientation === 'horizontal' ? 'horizontal' : 'vertical'})
          </button>
          <button type="button" onClick={() => dispatch({ type: 'randomize' })}>
            Randomize
          </button>
          <button type="button" onClick={() => dispatch({ type: 'clear' })}>
            Clear
          </button>
          <button
            type="button"
            className="primary"
            disabled={remaining.length > 0}
            onClick={() => dispatch({ type: 'start-battle' })}
          >
            Start battle
          </button>
        </div>
      )}

      <main className="boards">
        <div className="board-column">
          <h2 className="board-title">Your waters</h2>
          <BoardGrid
            label="Your waters"
            board={state.playerBoard}
            revealShips
            interactive={setup && Boolean(selectedShip)}
            ghost={setup && selectedShip ? { spec: selectedShip, orientation: state.orientation } : null}
            onCellClick={(coord) => dispatch({ type: 'place-ship', coord })}
            lastShot={state.lastAiShot}
          />
          <FleetPanel
            title={setup ? 'Your fleet' : 'Your ships'}
            fleet={state.fleet}
            board={state.playerBoard}
            selectedShipId={state.selectedShipId}
            onSelect={(shipId) => dispatch({ type: 'select-ship', shipId })}
            onRemove={(shipId) => dispatch({ type: 'remove-ship', shipId })}
            setup={setup}
          />
        </div>

        <div className="board-column">
          <h2 className="board-title">Enemy waters</h2>
          <BoardGrid
            label="Enemy waters"
            board={state.aiBoard}
            revealShips={state.phase === 'over'}
            interactive={state.phase === 'battle' && state.turn === 'player' && !state.awaitingAi}
            onCellClick={(coord) => dispatch({ type: 'player-fire', coord })}
          />
          <FleetPanel title="Enemy fleet" fleet={state.fleet} board={state.aiBoard} />
        </div>
      </main>

      {state.log.length > 0 && <MoveLog log={state.log} />}

      {state.phase === 'over' && (
        <GameOver
          state={state}
          onPlayAgain={() => dispatch({ type: 'play-again' })}
          onNewSetup={() => dispatch({ type: 'new-setup' })}
        />
      )}

      <footer className="app-footer">
        Press <kbd>R</kbd> to rotate during setup. Built with React + TypeScript.
      </footer>
    </div>
  )
}
