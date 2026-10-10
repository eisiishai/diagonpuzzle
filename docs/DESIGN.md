# Game design

## Concept

A turn-based puzzle game played on a rectangular grid. On each turn the player
chooses where to fire a pellet into the grid. The pellet travels in a straight
line, one cell at a time, and is redirected by obstacles on the board —
especially 45° diagonal mirrors. The aim is to get the pellet to the goal.

## Turns

1. The player chooses a firing position: one of the rows, on the **left edge**
   of the grid (for now). The pellet always starts moving **right**.
2. The pellet travels through the grid until something ends its flight (see
   *Outcomes*).
3. The shot counter increases by one.
4. If the pellet reached the goal, the level is complete. Otherwise the next
   turn begins.

There is no limit on the number of shots for now. The shot counter is shown to
the player and is the level's score (fewer is better).

## Cell types

| Symbol | Name | Behavior |
|---|---|---|
| `.` | Empty | Pellet passes through unchanged. |
| `\` | Mirror (backslash) | Turns the pellet 90°: right → down, down → right, left → up, up → left. |
| `/` | Mirror (slash) | Turns the pellet 90°: right → up, up → right, left → down, down → left. |
| `#` | Wall | Stops the pellet. |
| `G` | Goal | Pellet reaches the goal; level complete. |

Mirrors are two-sided: a pellet is deflected from either side.

## Outcomes of a shot

| Outcome | When | Result |
|---|---|---|
| `goal` | Pellet enters the goal cell | Level complete |
| `exit` | Pellet leaves the grid through any edge | Next turn |
| `blocked` | Pellet hits a wall | Next turn |
| `loop` | Pellet returns to a cell it has already visited, moving in the same direction | Stop the shot; next turn (cannot happen with mirrors alone, but guards against future block types) |

## Levels

Levels are stored as text grids using the symbols above, for example:

```
. . \ . .
. # . . G
. / . \ .
```

The goal is typically placed toward the right side of the grid, opposite the
launch edge.

## Controls

- **Mouse:** hovering over a launch position selects its row; clicking fires.
- **Keyboard:** ↑/↓ (or W/S) select a row, Enter/Space fires.
- **M** or clicking the sound label toggles all sound; the choice is remembered.
- After completing a level, Enter/Space or the *Next level* button continues.
  After the last level, it returns to the title screen.
- **Esc** or the *Menu* label returns to the title screen at any time.
- A new shot can't be fired while the pellet is still moving.

## Title screen and progress

- The title screen shows the game's name ("Diagon Puzzle", a working title),
  a *Play* button and the level list. Navigate with ↑/↓ and Enter, or the mouse.
- *Play* starts the first uncompleted level and reads *Continue: level N* once
  some levels are completed, or *Play again from level 1* when all are.
- Level 1 is always unlocked; each further level unlocks when the previous one
  is completed. Locked levels are shown but can't be selected.
- Completed levels show the best (lowest) shot count. Completing a level again
  reports a new best or the existing one.
- Progress is saved in the browser (localStorage), keyed by each level's
  stable id, so levels can be reordered or added without breaking saves.
  *Reset progress* erases it after a second confirming click or Enter.

## Presentation

- The pellet's path is animated cell by cell, leaving a trail. When the shot
  ends, the trail is coloured by outcome: green for the goal, red otherwise.
- Sound effects for firing, mirror bounces (each further bounce in a shot is a
  step higher in pitch), hitting a wall, leaving the grid and reaching the goal;
  background music.
- Sound and music are currently placeholders synthesized in code (Web Audio
  API), to be replaced with real audio files later.

## Future ideas (not yet designed)

- Firing from other edges of the grid.
- More block types (e.g. one-way blocks, splitters, rotating or breakable
  mirrors).
- Player-placed blocks: the player places a limited set of blocks before or
  between shots.
- Shot limits or par scores per level.
- Level select and progress saving.

## Open questions

- Does the board change between turns (e.g. mirrors rotate when hit), or does
  every shot from the same row always produce the same result? If the board
  never changes, firing more than once from the same row gives no new
  information, so the puzzle will need something that makes later shots
  different — such as player-placed blocks.
