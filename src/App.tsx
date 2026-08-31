import { useEffect, useReducer, useRef, useState } from 'react'
import { BoardGrid } from './components/BoardGrid'
import { FleetPanel } from './components/FleetPanel'
import { GameOver } from './components/GameOver'
import { HistoryModal } from './components/HistoryModal'
import { RulesModal } from './components/RulesModal'
import { SettingsBar } from './components/SettingsBar'
import { initialState, reducer, unplacedShips } from './game/engine'
import { loadMuted, loadRulesDismissed, playEffect, saveMuted } from './sound'
import './App.css'

const AI_DELAY_MS = 700

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState())
  const [muted, setMuted] = useState(loadMuted)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(() => !loadRulesDismissed())
  const playedSeq = useRef(0)
  const historyButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!state.awaitingAi) return
    const timer = setTimeout(() => dispatch({ type: 'ai-turn' }), AI_DELAY_MS)
    return () => clearTimeout(timer)
  }, [state.awaitingAi])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'r' && state.phase === 'setup') dispatch({ type: 'rotate' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.phase])

  const latest = [state.lastShot.player, state.lastShot.ai]
    .filter((event) => event !== null)
    .sort((a, b) => b.seq - a.seq)[0]

  useEffect(() => {
    if (muted || !latest || latest.seq <= playedSeq.current) return
    playedSeq.current = latest.seq
    playEffect(latest.result)
  }, [latest, muted])

  useEffect(() => {
    if (muted || !state.winner) return
    playEffect(state.winner === 'player' ? 'win' : 'lose')
  }, [state.winner, muted])

  const setup = state.phase === 'setup'
  const selectedShip = state.fleet.find((s) => s.id === state.selectedShipId) ?? null
  const remaining = unplacedShips(state)

  const yourBoard = (
    <BoardGrid
      label="Your waters"
      board={state.playerBoard}
      revealShips
      interactive={setup && Boolean(selectedShip)}
      ghost={setup && selectedShip ? { spec: selectedShip, orientation: state.orientation } : null}
      onCellClick={(coord) => dispatch({ type: 'place-ship', coord })}
      pulse={state.lastShot.ai}
    />
  )

  const enemyBoard = (
    <BoardGrid
      label="Enemy waters"
      board={state.aiBoard}
      revealShips={state.phase === 'over'}
      interactive={state.phase === 'battle' && state.turn === 'player' && !state.awaitingAi}
      onCellClick={(coord) => dispatch({ type: 'player-fire', coord })}
      pulse={state.lastShot.player}
    />
  )

  const yourColumn = (
    <section className="board-column">
      <h2 className="board-title">Your waters</h2>
      {yourBoard}
      <FleetPanel
        title={setup ? 'Your fleet' : 'Your ships'}
        fleet={state.fleet}
        board={state.playerBoard}
        selectedShipId={state.selectedShipId}
        onSelect={(shipId) => dispatch({ type: 'select-ship', shipId })}
        onRemove={(shipId) => dispatch({ type: 'remove-ship', shipId })}
        setup={setup}
      />
    </section>
  )

  const enemyColumn = (
    <section className="board-column">
      <h2 className="board-title">Enemy waters</h2>
      {enemyBoard}
      <FleetPanel title="Enemy fleet" fleet={state.fleet} board={state.aiBoard} />
    </section>
  )

  return (
    <div className="app">
      <header className="app-header">
        <h1>Battleship</h1>
        <p className="tagline">
          {setup ? 'Deploy your fleet' : state.phase === 'battle' ? 'Battle in progress' : 'Game over'}
        </p>
        <button
          type="button"
          className="mute"
          aria-pressed={muted}
          onClick={() => {
            const next = !muted
            setMuted(next)
            saveMuted(next)
          }}
        >
          {muted ? 'Sound off' : 'Sound on'}
        </button>
        <button type="button" className="header-action" onClick={() => setRulesOpen(true)}>
          How to play
        </button>
      </header>

      <div className="status-row">
        <p className={`status status-${latest?.result ?? 'info'}`} role="status">
          {state.message}
        </p>
        {!setup && (
          <button type="button" ref={historyButton} onClick={() => setHistoryOpen(true)}>
            History
          </button>
        )}
      </div>

      {setup && (
        <>
          <SettingsBar
            difficulty={state.difficulty}
            onDifficulty={(difficulty) => dispatch({ type: 'set-difficulty', difficulty })}
            fleet={state.fleet}
            onFleet={(fleet) => dispatch({ type: 'set-fleet', fleet })}
            locked={false}
          />
          <div className="setup-controls">
            <button type="button" onClick={() => dispatch({ type: 'rotate' })}>
              Rotate ({state.orientation})
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
        </>
      )}

      {/* The board you act on is the large one: yours while placing, the enemy's in battle. */}
      <main className={`boards boards-${setup ? 'setup' : 'battle'}`}>
        {setup ? (
          <>
            {yourColumn}
            {enemyColumn}
          </>
        ) : (
          <>
            {enemyColumn}
            {yourColumn}
          </>
        )}
      </main>

      {state.phase === 'over' && (
        <GameOver
          state={state}
          onPlayAgain={() => dispatch({ type: 'play-again' })}
          onNewSetup={() => dispatch({ type: 'new-setup' })}
          onShowHistory={() => setHistoryOpen(true)}
        />
      )}

      {historyOpen && (
        <HistoryModal
          history={state.history}
          onClose={() => {
            setHistoryOpen(false)
            historyButton.current?.focus()
          }}
        />
      )}

      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}

      <footer className="app-footer">
        Press <kbd>R</kbd> to rotate during setup, <kbd>↑↓←→</kbd> to move across a grid and{' '}
        <kbd>Enter</kbd> to fire. Ships never touch, not even diagonally. Open <b>History</b> for past
        shots or <b>How to play</b> for the rules.
      </footer>
    </div>
  )
}
