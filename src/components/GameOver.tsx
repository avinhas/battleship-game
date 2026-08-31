import { accuracy, type GameState } from '../game/engine'
import { isSunk } from '../game/board'

type Props = {
  state: GameState
  onPlayAgain: () => void
  onNewSetup: () => void
  onShowHistory: () => void
}

export function GameOver({ state, onPlayAgain, onNewSetup, onShowHistory }: Props) {
  const won = state.winner === 'player'
  const playerAfloat = state.playerBoard.ships.filter((s) => !isSunk(s)).length
  const enemyAfloat = state.aiBoard.ships.filter((s) => !isSunk(s)).length
  const turns = state.stats.player.shots

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Game over">
      <div className="overlay-card">
        <h2>{won ? 'Victory' : 'Defeat'}</h2>
        <p className="overlay-sub">
          {won
            ? 'You sank the entire enemy fleet.'
            : 'The enemy sank your entire fleet.'}
        </p>
        <dl className="stats">
          <div>
            <dt>Turns</dt>
            <dd>{turns}</dd>
          </div>
          <div>
            <dt>Your shots</dt>
            <dd>{state.stats.player.shots}</dd>
          </div>
          <div>
            <dt>Your hits</dt>
            <dd>{state.stats.player.hits}</dd>
          </div>
          <div>
            <dt>Your accuracy</dt>
            <dd>{accuracy(state.stats.player)}%</dd>
          </div>
          <div>
            <dt>Enemy accuracy</dt>
            <dd>{accuracy(state.stats.ai)}%</dd>
          </div>
          <div>
            <dt>Ships afloat</dt>
            <dd>
              you {playerAfloat} · enemy {enemyAfloat}
            </dd>
          </div>
        </dl>
        <div className="overlay-actions">
          <button type="button" className="primary" onClick={onPlayAgain}>
            Play again
          </button>
          <button type="button" onClick={onNewSetup}>
            New setup
          </button>
          <button type="button" onClick={onShowHistory}>
            History
          </button>
        </div>
      </div>
    </div>
  )
}
