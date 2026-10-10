# Roadmap

Status is tracked only here. Check items off as they are completed.

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

- [ ] Animate the pellet moving cell by cell
- [ ] Keyboard controls: arrows to select a row, Enter/Space to fire
- [ ] Highlight the selected/hovered launch position
- [ ] Sound effects (fire, bounce, wall, exit, goal)
- [ ] Background music, with mute
- [ ] Several levels and moving to the next level

## M3 — Game structure

- [ ] Title screen and level select
- [ ] Save progress and best shot counts (localStorage)
- [ ] Decide on and design the next mechanic (see *Open questions* in DESIGN.md)

## Later

- Player-placed blocks
- Firing from other edges
- New block types
- Graphics and art pass
