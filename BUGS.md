# Bug log

Plain-language notes on problems hit while building this and how they were fixed.

## 1. Tests wouldn't run at all — Node was too old

The project scaffold pulled in the latest Vite, which ships a compiled native binary that needs Node 22. The machine had Node 20.18, so every test run crashed with "cannot find module rolldown-binding". Fixed by installing Node 22 and reinstalling dependencies. The deploy workflow pins Node 22 so CI can't hit the same thing.

## 2. TypeScript refused to log the AI's shot

The AI picks a shot, then the board resolves it. The board can answer "invalid" (for a repeat or off-board shot), which the AI can never actually trigger since it only picks untouched cells — but the compiler doesn't know that, so it rejected passing that result into the battle log. Added an explicit guard that hands the turn back if the shot ever comes back invalid, which both satisfies the compiler and makes the game fail safe instead of freezing.

## 3. Leftover markup from the starter template in the board component

While writing the board grid I left a stray placeholder element in the row-rendering loop. It would have rendered an unknown tag inside the grid. Caught it before running the app and removed it.

## 4. GitHub Pages could not be enabled automatically

The deploy workflow ran but failed at the step that turns Pages on: the token available to me isn't allowed to create a Pages site on someone else's repo. Nothing wrong with the build itself. Fixed by having the repo owner set Pages' source to "GitHub Actions" once in repo settings; the workflow then deploys on every push.

## 5. On a phone you had to scroll past the settings to see the board

End-to-end testing on a narrow screen showed the difficulty buttons and fleet chips wrapping onto four rows, pushing the boards below the fold on first load. Not broken, just annoying. The settings are now a collapsible section that starts closed on small screens and shows a one-line summary ("Medium · 5 ships").
