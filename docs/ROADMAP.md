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
  - [x] One player-placed mirror of a fixed direction, on any empty cell,
    placed between shots without taking one; levels 15–16 use it. Design
    in `docs/DESIGN.md`, *Player-placed mirror*
  - [ ] Option to rotate the placed mirror (choose `\` or `/`)
  - [ ] More mirrors per level, or other placeable blocks
- [ ] Firing from other edges
- [ ] New block types
  - [x] Breakable walls (`%`): stop the pellet once and break; levels
    11–14 use them (13–14 with two-hit goals)
- [x] Optional bonus targets: one extra target per level, not needed to
  finish and not counted in par, shown once the level has been completed
  at par; collecting it turns the level's star golden. Design in
  `docs/DESIGN.md`, *Bonus targets*
- [x] Multi-hit goal: a goal that must be hit several times to complete the
  level, showing the hits remaining. Decided: each hit is a separate shot,
  mirror flips stay between hits, and par counts all shots. Levels 5–6
  teach it

### Difficulty curve

Measured on 2026-10-10 (v0.34) by `npm run levels`, which ends with this
curve: the chance that random play completes a level within par (a random
row each shot; in player-mirror levels a random cell for the mirror, or
keeping it). Lower is harder. It dips at each new mechanic (5, 11,
13, 15), as intended:

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| 1 in | 5 | 6 | 25 | 36 | 16 | 64 | 36 | 343 | 343 |

| Level | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 |
|---|---|---|---|---|---|---|---|---|
| 1 in | 2,048 | 216 | 2,401 | 125 | 7,776 | 112 | 3,333 | 47,500 |

Random odds understate how easy level 15 feels (the mirror's cell is easy
to see) and overstate levels that repeat a row (8, 11).

- [ ] Smooth the step to level 17, about 14 times harder than 16 and 6
  times harder than 14: add a par-3 level between them (player mirror with
  a two-hit goal or breakable walls; `npm run generate` with
  `--player-mirror slash --breakable 2 --goal-hits 2 --shots 3` found
  several), or make 17 par 3
- [ ] Optional: level 7 is a slight dip after levels 5–6 (as hard as 4)

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
- [x] Level generator, `npm run generate`: searches random boards for a given
  par and size, preferring a unique shortest solution

### Later

- [x] Version tags: each commit on `main` is tagged automatically
  (`.githooks/`, details in `docs/WORKFLOW.md`)
- [x] Full check (`npm run build`) runs automatically before each commit
- [x] Upgrade ESLint 9 → 10 (9 shows a deprecation notice)
- [x] Upgrade Vite 6 → 8 (test the game in the browser afterwards)
- [ ] Upgrade TypeScript 5.7 → 7, once typescript-eslint supports it
  (currently TypeScript < 6.1)
- [x] Difficulty measure in `npm run levels`: the random-play odds of
  *Difficulty curve* above, per level and as a curve at the end
  (`scripts/difficulty.ts`)
  - [ ] Likely needs adjusting later: it measures how many ways there are
    to play, not how much insight a level needs, so it overrates levels
    whose key move is easy to see (15) and those repeating a row (8, 11).
    Compare it with how testers actually do, then refine it (e.g. weight
    moves a player would try first) or add a second measure
- [ ] Automated browser smoke tests (e.g. Playwright), if the UI grows enough
  that manual checks become a burden

## Discarded ideas

Ideas that were tried or designed and then dropped, with the reason, so
they aren't proposed again without new arguments. Each could come back if
the reason no longer holds.

- **Fixed mirror slots** (2026-10-10): a level marked a cell (`n` for `\`,
  `z` for `/`) where the player could place a mirror once; the player
  chose only *when* to place it. Built and playable, but never released:
  replaced by the player-placed mirror on any empty cell before it was
  committed. Reason: no use was seen for a fixed position once the mirror can go
  on any empty cell, which was the intended mechanic.
