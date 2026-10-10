# Roadmap

Status is tracked only here. Check items off as they are completed.

Completed milestones are kept below for history. Open work is split into two
tracks:

- **Game track:** what the player sees and plays: mechanics, levels,
  presentation, platforms. New mechanics are designed in `docs/DESIGN.md`
  before they are built.
- **Engineering track:** how the project is built: code structure, testing,
  tooling, deployment. These change no gameplay.

Ordering: finish *Engineering → Next* before starting the next new mechanic,
since those items make mechanic changes safer to build and test.

## M1 — Playable prototype

One level, playable with the mouse, plain graphics.

- [x] Game model in `src/game/`: directions, positions, cell types, board
- [x] Cell behaviors for empty, `\`, `/`, wall and goal
- [x] Pellet simulation: `fire(board, row)` → path + outcome (`goal` / `exit` / `blocked` / `loop`)
- [x] Level text format and parser in `src/levels/`, with a first level
- [x] Unit tests for the simulation and parser (Vitest)
- [x] Draw the grid and cells with PixiJS (`Graphics`, no art yet)
- [x] Launch positions on the left edge; click to fire
- [x] Show the pellet's path after firing (no animation needed yet)
- [x] Shot counter on screen
- [x] "Level complete" message when the goal is reached
- [x] Remove the template's bunny and assets

## M2 — Feel and controls

- [x] Animate the pellet moving cell by cell
- [x] Keyboard controls: arrows to select a row, Enter/Space to fire
- [x] Highlight the selected/hovered launch position
- [x] Sound effects (fire, bounce, wall, exit, goal) — synthesized placeholders
- [x] Background music, with mute
- [x] Several levels and moving to the next level

## M3 — Game structure

- [x] Title screen and level select
- [x] Save progress and best shot counts (localStorage)
- [x] Decide on and design the next mechanic: mirrors flip when hit
- [x] Restart a level (R)
- [x] Level solver; tests check each level's minimum shot count

## Game track

### Next

- [x] More levels built around flipping mirrors, with rising difficulty
  (levels 5–8: 2, 3, 3 and 4 shots)
- [x] Par scores: show each level's minimum shot count and reward matching it
  with a star
- [x] Scale the game to fit the window, so larger levels work on small
  screens and phones (touch input already works through pointer events)

### Mechanic ideas

Each needs a design in `docs/DESIGN.md`, and a decision on how it interacts
with flipping mirrors, before it is built.

- [ ] Player-placed blocks
- [ ] Firing from other edges
- [ ] New block types
- [ ] Optional bonus targets: extra targets in some levels that are not
  needed to finish and not counted in par. A level can still be completed at
  par without them; hitting them as well earns a hidden achievement.
  Decided:
  - Bonus targets can be collected across tries: each one stays collected
    once hit.
  - A level's bonus targets are hidden until the level has been completed
    at par with the normal goal; only then do they appear on the board.
  - Collected bonus targets are saved per level, separately from goal
    completion and the best shot count.
  - The level's star turns golden once its bonus targets are collected,
    instead of the normal par star, in the level list and elsewhere the
    star is shown.
  - Collecting the last bonus target of the whole game plays a special
    animation and sound, like the celebration for reaching par on every
    level.
  - Hitting a bonus target stops the beam, like the goal.
  - Bonus targets are hit during a try, before the goal; completing the
    level still ends the try (no shooting afterwards).
  - A bonus hit is saved immediately, even if that try is not finished.
  - Shots spent on bonus targets count in the try's shot total, but never
    take away a par star already earned (only a better score replaces the
    best).
  Still to decide when designing: how bonus targets look and their symbol
  in the level text format, and how the solver and tests check that every
  bonus target can be reached
- [x] Multi-hit goal: a goal that must be hit several times to complete the
  level, showing the hits remaining. Decided: each hit is a separate shot,
  mirror flips stay between hits, and par counts all shots. Levels 9–10
  teach it

### Presentation

- [x] Graphics and art pass: "Laser lab" direction (style guide in
  `docs/DESIGN.md`, Art direction)
- [x] Sound design pass: effects and music designed in code (Web Audio) to
  match the Laser lab look, chosen with a sound test page; music per level
  - [x] Lower the music during celebrations (ducking), so fanfares stand out
  - [x] Limit overlapping sounds, so rapid bounces don't get too loud
  - [x] Balance volumes between music and effects
  - [x] Small random pitch variation, so repeated sounds don't feel
    mechanical
- [x] Show shot outcomes by shape or icon as well as colour (colour-blind
  players)
- [x] Small ambient animations (e.g. a gently pulsing goal crystal, a faint
  moving background grid)

## Engineering track

### Next

- [x] Run the tests as part of `npm run build`, so a deployed build has always
  passed them
- [x] Move level state (phase, current board, shot count, restart, whether a
  shot may be fired) from `GameScene` into a pure `LevelSession` class in
  `src/game/` with tests; `GameScene` only displays it
- [x] Level design tool, `npm run levels`: prints each level's shortest
  solution, setup routes and first-shot outcome per row (runs with `tsx`)

### Later

- [x] Version tags: each commit on `main` is tagged automatically
  (`.githooks/`, details in `docs/WORKFLOW.md`)
- [x] Full check (`npm run build`) runs automatically before each commit
- [x] Upgrade ESLint 9 → 10 (9 shows a deprecation notice)
- [x] Upgrade Vite 6 → 8 (test the game in the browser afterwards)
- [ ] Upgrade TypeScript 5.7 → 7, once typescript-eslint supports it
  (currently TypeScript < 6.1)
- [ ] Automated browser smoke tests (e.g. Playwright), if the UI grows enough
  that manual checks become a burden
