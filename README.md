# Battleship

An earlier build for the same exercise, exploring a React/TypeScript stack. The version I'm presenting is battleship-gamev3, built with a spec-first workflow.

A browser-playable Battleship game: you against a computer opponent. React + TypeScript, no game-logic dependencies.

**Play:** https://avinhas.github.io/battleship-game/

## Gameplay

- 10x10 grid, coordinates A–J / 1–10.
- Default fleet: Carrier 5, Battleship 4, Cruiser 3, Submarine 3, Destroyer 2. Extra ships (Patrol Boat, Corvette, Dreadnought) can be toggled in before a battle starts.
- Place ships by selecting one and clicking a cell; `R` or the Rotate button flips orientation. Randomize and Clear are available, and clicking a placed ship picks it back up.
- Ships may never touch, not even diagonally — this applies to your placements, the Randomize button and the AI's fleet.
- You fire first; the AI replies after a short delay. Hits, misses and sunk ships are marked on both boards with splash/blast animations and sound (toggleable), plus fleet panels and a status line.
- When a fleet is wiped out, the end screen shows turns, shots, hits, accuracy for both sides, and offers Play again (same fleet, re-randomised positions) or New setup.

## AI difficulties

| Level | Behaviour | Average shots to clear the default fleet (300 games) |
| --- | --- | --- |
| Easy | Fires at random untried cells | 95.1 |
| Medium | Random hunt, then targets around a hit and follows the ship's axis | 51.0 |
| Hard | Same targeting plus probability-density hunting over all remaining ship placements | 44.5 |

The AI only sees its own shot results — it never reads the player's ship positions.

## Development

```bash
npm install     # requires Node 22+
npm run dev     # local dev server
npm test        # unit tests (game logic, AI, state machine)
npm run lint
npm run build
```

Source layout:

- `src/game/board.ts` — board, placement rules, firing, random fleet placement
- `src/game/ai.ts` — shot selection for each difficulty
- `src/game/engine.ts` — game state machine (setup → battle → over)
- `src/components/` — board grid, fleet panels, settings, end screen
- `src/sound.ts` — synthesised hit/miss/sunk effects (no audio assets)

Pushing to `main` builds, lints, tests and deploys to GitHub Pages via `.github/workflows/deploy.yml`.
