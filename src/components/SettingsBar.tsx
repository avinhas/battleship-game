import { useState } from 'react'
import type { Difficulty } from '../game/ai'
import { DEFAULT_FLEET, EXTRA_SHIPS, type ShipSpec } from '../game/types'

type Props = {
  difficulty: Difficulty
  onDifficulty: (difficulty: Difficulty) => void
  fleet: ShipSpec[]
  onFleet: (fleet: ShipSpec[]) => void
  locked: boolean
}

const ALL_SHIPS = [...DEFAULT_FLEET, ...EXTRA_SHIPS]
const DIFFICULTIES: { id: Difficulty; label: string; hint: string }[] = [
  { id: 'easy', label: 'Easy', hint: 'fires at random' },
  { id: 'medium', label: 'Medium', hint: 'hunts down hits' },
  { id: 'hard', label: 'Hard', hint: 'probability targeting' },
]

/** Collapsed on phones so the boards stay near the top of the page. */
function prefersCollapsed(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches
}

export function SettingsBar({ difficulty, onDifficulty, fleet, onFleet, locked }: Props) {
  const [open, setOpen] = useState(() => !prefersCollapsed())

  const toggle = (spec: ShipSpec) => {
    const next = fleet.some((s) => s.id === spec.id)
      ? fleet.filter((s) => s.id !== spec.id)
      : ALL_SHIPS.filter((s) => fleet.some((f) => f.id === s.id) || s.id === spec.id)
    if (next.length === 0) return
    onFleet(next)
  }

  return (
    <details className="panel settings" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        Difficulty &amp; fleet
        <span className="summary-value">
          {DIFFICULTIES.find((d) => d.id === difficulty)!.label} · {fleet.length} ships
        </span>
      </summary>
      <div className="settings-body">
        <div className="setting-group">
          <h2>Difficulty</h2>
          <div className="segmented">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                type="button"
                className={difficulty === d.id ? 'active' : ''}
                onClick={() => onDifficulty(d.id)}
                title={d.hint}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="hint">{DIFFICULTIES.find((d) => d.id === difficulty)!.hint}</p>
        </div>
        <div className="setting-group">
          <h2>Fleet</h2>
          <div className="chips">
            {ALL_SHIPS.map((spec) => {
              const active = fleet.some((s) => s.id === spec.id)
              return (
                <button
                  key={spec.id}
                  type="button"
                  className={`chip${active ? ' active' : ''}`}
                  disabled={locked}
                  onClick={() => toggle(spec)}
                >
                  {spec.name} <span className="chip-size">{spec.size}</span>
                </button>
              )
            })}
          </div>
          <p className="hint">
            {locked ? 'Fleet is locked during battle.' : 'Tap a ship to add or remove it.'}
          </p>
        </div>
      </div>
    </details>
  )
}
