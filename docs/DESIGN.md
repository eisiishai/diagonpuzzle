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
3. Every mirror the pellet bounces off flips (see *Flipping mirrors*), so the
   board is different for the next shot.
4. The shot counter increases by one.
5. If the pellet reached the goal, the level is complete. Otherwise the next
   turn begins.

There is no limit on the number of shots for now. The shot counter is shown to
the player and is the level's score (fewer is better).

**Restart** (R, or the *Restart* label) puts the level back to its starting
board and resets the shot counter. Since every shot changes the board, a
player can otherwise get into a state they can't solve from.

## Flipping mirrors

Each time the pellet bounces off a mirror, the mirror flips: `\` becomes `/`
and `/` becomes `\`. The flip happens at the moment of the hit, so if the same
shot comes back to that mirror, it meets the flipped mirror. Each hit is one
flip, so a mirror hit twice in one shot ends up as it started.

This is the core puzzle: a shot that misses the goal still changes the board,
and the player plans shots that set up the board for a later shot.

## Multi-hit goal

Some levels' goal needs several hits (`goalHits` in the level list; default
1):

- Each hit must come from a separate shot. The goal stops the beam, so one
  shot can never hit it twice.
- A goal hit that is not yet the last one ends the shot like any other: the
  board keeps every mirror flipped so far, and play continues.
- The level is complete on the last hit; par and stars count the shots for
  the whole level as usual.
- Small diamonds under the goal crystal show the hits needed, filled for each
  hit so far; the header shows `GOAL 1/2`. A non-final hit says "Goal hit!
  Hit it once more to finish."
- Restarting resets the hits along with the board.

## Cell types

| Symbol | Name | Behavior |
|---|---|---|
| `.` | Empty | Pellet passes through unchanged. |
| `\` | Mirror (backslash) | Turns the pellet 90°: right → down, down → right, left → up, up → left. Then flips to `/`. |
| `/` | Mirror (slash) | Turns the pellet 90°: right → up, up → right, left → down, down → left. Then flips to `\`. |
| `#` | Wall | Stops the pellet. |
| `G` | Goal | Pellet reaches the goal; level complete. |

Mirrors are two-sided: a pellet is deflected from either side.

## Outcomes of a shot

| Outcome | When | Result |
|---|---|---|
| `goal` | Pellet enters the goal cell | Level complete |
| `exit` | Pellet leaves the grid through any edge | Next turn |
| `blocked` | Pellet hits a wall | Next turn |
| `loop` | Pellet returns to a cell it has already visited, moving in the same direction, with the board in the same state | Stop the shot; next turn. Cannot happen with the current cells: every step can be traced back uniquely, so a shot that enters from the edge must end. Guards against future block types. |

## Levels

Levels are stored as text grids using the symbols above, for example:

```
. . \ . .
. # . . G
. / . \ .
```

The goal is typically placed toward the right side of the grid, opposite the
launch edge.

Each level declares `minShots`, the fewest shots that solve it. A solver
(`src/game/solver.ts`) searches every sequence of shots, and the tests check
each level's `minShots` against it.

Levels 1 and 2 also have a two-shot *setup route*: a first shot that misses
but changes the board so that a second shot wins, which would not win on the
starting board. This lets players discover flipping before level 3 requires
it. `setupRoutes()` in the solver finds such routes; the tests check that
levels 1 and 2 have one.

| # | Level | Min shots | Idea |
|---|---|---|---|
| 1 | First light | 1 | Row 4 reaches the goal directly. Alternative: row 5 misses but flips three mirrors, after which row 1 gets through. |
| 2 | Up and over | 1 | Row 5 reaches the goal directly. Alternative: row 1 runs down column 3 and flips the mirrors at both ends; row 6 then runs back up it and round to the goal. |
| 3 | Second try | 2 | The first shot from row 2 flips the mirror at the edge; the same row then reaches the goal. Teaches flipping. |
| 4 | Set the stage | 2 | A shot from row 4 flips two mirrors in column 4, which the next shot from row 3 needs. A different row must set up the board. |
| 5 | Down and around | 2 | Row 6 climbs column 1 and flips its corner mirrors; row 2 then runs down and around the board. |
| 6 | Third time lucky | 3 | Row 5 twice turns the pellet a step further each time; row 2 then loops to the goal. First level needing three shots. |
| 7 | Back and forth | 3 | Rows 4, 6, 4: two different setup shots, and a final shot that crosses its own path. |
| 8 | Two-step | 4 | Rows 3, 5, 3, 5: each shot flips mirrors the other row's next shot needs. |
| 9 | Double take | 2 | Goal needs 2 hits. Row 3 climbs two mirrors into the goal, flipping them; that lets row 1 come down into the goal too. Repeating row 3 misses. Teaches the multi-hit goal. |
| 10 | Encore | 3 | Goal needs 2 hits. Row 3 first hits a wall (a setup shot), then climbs into the goal; that lets row 1 hit it too. |

Levels 5–10 were found by searching random boards with the solver, keeping
ones with exactly one shortest solution, and choosing by readability and
variety of solutions. Levels 9–10 are deliberately small, to teach the
multi-hit goal.

## Controls

- **Mouse:** hovering over a launch position selects its row; clicking fires.
- **Keyboard:** ↑/↓ (or W/S) select a row, Enter/Space fires.
- Music and sound effects are switched on and off separately: **M** or the
  *Music* label for music, **F** or the *Sounds* label for sound effects.
  Both choices are remembered. (Players who had muted all sound before the
  split start with both off.)
- After completing a level, Enter/Space or the *Next level* button continues.
  After the last level, it returns to the title screen.
- **Esc** or the *Menu* label returns to the title screen at any time.
- **Hidden skip:** Shift+N, or three quick clicks or taps on the level name in
  the header, moves on to the next level without completing the current one
  (from the last level: back to the title screen). Nothing in the game
  mentions it. A skipped level counts as not passed (no ✓, no star) and shows
  "skipped" in the level list, but it unlocks the level after it. Completing
  it later makes it an ordinary completed level. *Continue* on the title
  screen goes to the first level that is neither completed nor skipped, and
  only then back to skipped ones.
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
- **Par** is a level's minimum shot count (`minShots`). It is shown in the
  game header and in the level list. Completing a level in par earns a star
  (★), shown in the level list; the list header shows stars earned out of the
  total. The completion message says whether par was reached. Stars are
  worked out from the saved best scores, so they need no extra saved data.
- **Par celebrations.** Completing a level in par plays a brighter version of
  the goal tune with sparkles, and stars burst from the goal with an expanding
  ring. Earning the last missing star, so that every level is completed in
  par, plays a longer fanfare instead: a bigger burst, stars raining over the
  screen and an "All levels at par!" banner. That happens once, on the shot
  that earns the last star; once all stars are earned, the level list header
  turns gold and reads "all at par!".
- Progress is saved in the browser (localStorage), keyed by each level's
  stable id, so levels can be reordered or added without breaking saves.
  *Reset progress* erases it after a second confirming click or Enter.
- The game's version (e.g. `v0.9`) is shown in small text at the bottom of the
  title screen.

## Presentation

- The pellet's path is animated cell by cell as a laser beam. When the shot
  ends, its outcome is shown by shape as well as colour (see *Art direction*).
- Sound effects and background music; see *Sound*.
- Screens shrink to fit the window, keeping a 16 px margin, so large levels
  work on small screens and phones; they are never enlarged, which would blur
  text. The game renders at the screen's pixel density, so text is sharp on
  high-resolution displays. On touch screens, tapping an arrow fires.

## Art direction: Laser lab

The game looks like a dark laboratory where a laser is steered with glass
mirrors. The board and its pieces glow; the interface around them is quiet
and technical. Mock-ups: the "A · Laser lab" artboard of the art-directions
canvas. Colours and fonts are defined once in `src/render/theme.ts`.

### Palette

| Role | Colour | Use |
|---|---|---|
| Background | `#0a0e18` | Page and screen background |
| Panel | `#0f1728`, border `#24375a` | Board, buttons |
| Grid | `#172540` | Grid lines and dots |
| Text | `#e6f1ff` | Headings, values |
| Dim text | `#9fb6d6` | Labels, secondary buttons |
| Beam | `#ff4d7d`, core `#fff3f6` | Laser beam, selected emitter |
| Glass | `#4f9fe0` → `#d8f3ff`, highlight `#f2fbff` | Mirrors |
| Success | `#3dffb4` | Goal crystal, completed shots, primary button |
| Star | `#ffe08a` | Stars, par celebrations |
| Wall | `#18233a`, edge `#34466b` | Walls |
| Idle emitter | `#3b5a86` | Launchers not selected |

Text colours keep at least 4.5:1 contrast on the background.

### Type

- **Chakra Petch** (500, 700) for all interface text. Headings and buttons in
  capitals with slightly wide letter spacing.
- **JetBrains Mono** (500) for numbers that change: shots, par.
- Fonts are bundled with the game (Fontsource packages), never loaded from a
  font service.

### Shapes

- **Emitters** (launchers): rounded boxes with a triangular nozzle; the
  selected one is outlined in the beam colour and glows.
- **Mirrors**: glass bars with a bright centre line, glowing pale blue.
- **Walls**: dark rounded blocks with diagonal hatching, no glow.
- **Goal**: a crystal (diamond within a diamond) glowing green.
- **Beam**: a glowing coloured band with a thin white core.
- **Buttons**: rounded rectangles with a thin outline; the primary action
  (*Next level*) is filled with the success colour.

### Light and motion

- Glow comes from a bloom effect on the board: only bright things glow
  (beam, mirrors, goal, selected emitter); the panel and grid stay dark.
- Mirrors turn 90° in 150 ms when hit; the beam travels about 9 cells a
  second.
- Celebrations use star-shaped particles in the star and success colours.
- Ambient motion, kept slow and subtle so it never distracts from puzzling:
  the goal crystal breathes (grows about 7 % and brightens, every 2.4 s), the
  selected emitter's glow pulses at the same pace, the crystal under the
  title pulses like the goal, and a faint grid behind every screen drifts
  very slowly down and to the right (1.5 px a second: one grid square in
  about half a minute). Its lines are one screen pixel wide, on the screen's
  pixel grid, and it moves in whole screen pixels, so it stays crisp without
  shimmering.
- When the player's system asks for reduced motion, all ambient motion stops;
  the pieces stay at rest.

### Readability

- Shot outcomes are shown by **shape** as well as colour, so they can be told
  apart without colour vision: reaching the goal turns the whole beam green;
  a miss dims the beam and marks where it ended: an **×** at a wall, an
  open **chevron** pointing off the board where it left, a **ring** for a
  loop.
- Glow never replaces outlines: every piece is recognisable with the bloom
  turned off.

## Sound

All sound is synthesized in code with the Web Audio API: no audio files.
Effects and music were chosen by ear on the sound lab page (an artifact with
every variant), so the names below are its variant names.

### Effects

| Event | Sound |
|---|---|
| Fire | *Soft pulse*: a gentle falling tone with a breath of air |
| Mirror bounce | *Crystal ping*: a small bell; each further bounce in a shot is two semitones higher (capped) |
| Wall | *Soft knock* |
| Off the board | *Two-tone drop*: two notes stepping down |
| Loop | *Question chime*: two bells rising |
| Goal (above par) | *Crystal chime*: glassy notes rising |
| Par | *Chime and sparkle* |
| Final star | *Synth fanfare*: brassy chords stepping up into a bright chord |

### Music

| Where | Track |
|---|---|
| Title screen | **Night lab**: calm synthwave, pads and an echoing arpeggio, 84 BPM |
| Levels 1–4 | **Pulse**: driving synthwave with a soft beat, 104 BPM |
| Levels 5–8 | **Glass garden**: a slow, dark ambient drone only (no melody), so it stays out of the way on the harder levels |
| Levels 9–10 | **Night lab**, as on the title screen |

Each level names its track (`music` in `src/levels/levels.ts`). Moving
between levels with the same track keeps the music playing; a different
track crossfades in over about a second.

### Mix

- Effects at 80 %, music at 45 % of their full level (balanced by ear).
- The music drops to a quarter during the par and final-star sounds
  (ducking), so they stand out.
- At most six effects play at once; extra ones are skipped (goal, par and
  final-star sounds always play).
- Fire, wall and off-the-board sounds vary in pitch by up to a quarter of a
  semitone, so repeats don't sound mechanical.
- Music and effects can each be switched off; their reverb and echo tails go
  silent with them.

## Future ideas (not yet designed)

- Firing from other edges of the grid.
- More block types (e.g. one-way blocks, splitters, rotating or breakable
  mirrors).
- Player-placed blocks: the player places a limited set of blocks before or
  between shots.
- Shot limits or par scores per level.
- Level select and progress saving.

## Open questions

- None at the moment. (Resolved: the board changes between shots because
  mirrors flip when hit.)
