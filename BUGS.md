# Bug log

Plain-language notes on problems hit while building this and how they were fixed.

## 1. Tests wouldn't run at all — Node was too old

The project scaffold pulled in the latest Vite, which ships a compiled native binary that needs Node 22. The machine had Node 20.18, so every test run crashed with "cannot find module rolldown-binding". Fixed by installing Node 22 and reinstalling dependencies. The deploy workflow pins Node 22 so CI can't hit the same thing.

## 2. TypeScript refused to log the AI's shot

The AI picks a shot, then the board resolves it. The board can answer "invalid" (for a repeat or off-board shot), which the AI can never actually trigger since it only picks untouched cells — but the compiler doesn't know that, so it rejected passing that result into the battle log. Added an explicit guard that hands the turn back if the shot ever comes back invalid, which both satisfies the compiler and makes the game fail safe instead of freezing.

## 3. Leftover markup from the starter template in the board component

While writing the board grid I left a stray placeholder element in the row-rendering loop. It would have rendered an unknown tag inside the grid. Caught it before running the app and removed it.
