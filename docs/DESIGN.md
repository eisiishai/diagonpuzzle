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

## Bonus targets

Every level has an optional bonus target (`*` in the level list): a
puzzle on top of the level for players who have mastered it.

- **Hidden until par.** A level's bonus target appears only on visits
  after the level was completed at par: not on the visit that first
  reaches par (restarting doesn't show it either), but once the player
  goes back to the menu, or on to another level, and returns. Until then
  its cell is empty.
- **Hitting it** stops the beam, like the goal, and collects it: the
  target disappears with a burst of colour and the board keeps the
  mirrors the shot flipped. Play continues; completing the level still
  ends the try.
- **Collected for good, playable again.** A hit is saved at once, even if
  the try is never finished. The target is gone for the rest of that try,
  but a restart brings it back, and it keeps appearing on later visits
  after it has been collected, so it can be replayed like the level
  itself. Hitting it again plays the bonus burst and sound; the golden
  star and the last-bonus celebration happen only the first time.
  Collected targets are saved per level, apart from
  completion and best scores, by their index in reading order (row by row),
  so don't add a second target before an existing one in a released level.
- **Shots** spent on a bonus target count in the try's total like any
  other, but never take away a par star already earned: only a better
  score replaces the best.
- **Golden star.** Once a level's bonus target is collected, its par star
  turns golden in the level list, which also shows `GOLDEN ★ n/10` once
  there is at least one. The header shows `BONUS 0/1` while playing a
  level whose bonus target has appeared.
- **Last bonus target of the game:** a celebration like the one for the
  last par star, in the bonus colours, with an "All bonus targets found!"
  banner and its own fanfare.
- **Design checks.** Each level declares `bonusShots`, the fewest shots
  that hit its bonus target from the starting board without completing the
  level first (a non-final hit of a multi-hit goal is allowed). The tests
  check it with the solver (`solveBonus()`), check `minShots` with the
  bonus target removed (it is hidden until par), and check that par is
  still possible with the target showing. At most one per level for now.
- **Harder than par.** A bonus target needs more shots than par: one
  more on levels 2–9, two more on level 10. Only level 1's takes as few
  as par (1). A test checks `bonusShots` > `minShots` beyond level 1.
  To get there, levels 3, 4 and 6–10 each got one extra mirror (on level
  10 in place of a wall), chosen so that par and the par solution stay
  the same. Targets sit where they don't block the par solution, and
  their routes mix several rows rather than repeating one; `npm run
  levels` shows the shortest route to each.

## Player-placed mirror

Some levels give the player a mirror of their own (`playerMirror` in the
level list), to place once, anywhere it fits:

- **Fixed direction, free cell.** The level decides which mirror the
  player gets, `\` or `/`; the player decides *where* it goes, and *when*.
  It can't be turned (a rotate option may come later).
- **Where:** any empty cell. Not on another piece, the goal or a showing
  bonus target; a cell emptied by a broken wall or a collected bonus target
  is empty, so it counts.
- **When:** whenever a shot could be fired: before the first shot or
  between shots, not while the pellet is moving or after the level is
  complete. Placing takes no shot, so it doesn't count towards par.
- **Once placed** it is an ordinary mirror: it turns the pellet and flips
  when hit. It can't be moved or taken back; *Restart* returns it to the
  player.
- **Placing it** (see *Controls*): with a mouse, hovering over an empty
  cell previews the mirror there and a click places it. On a touch screen
  the first tap previews it and a second tap on the same cell places it,
  so a stray tap doesn't use it up. With the keyboard, P shows a cell
  cursor. The mirror drops into place with a glassy click.
- **Header:** `MIRROR ×1` while the mirror is in hand, `MIRROR ×0` once
  placed.
- **For now** one mirror per level. More mirrors, a choice of direction or
  other placeable blocks could follow.
- **Design checks.** The solver tries placing the mirror on every empty
  cell before every shot (free moves), so `minShots` and `bonusShots`
  count shots only. Solutions are lists of moves: a row fired, or the
  mirror placed; `npm run levels` shows a placement as e.g. `/ at (3,4)`
  (column, row) and counts the shortest solutions, so a level can be
  checked for a unique one. A test checks that every level with a player
  mirror can't reach par without it.

## Cell types

| Symbol | Name | Behavior |
|---|---|---|
| `.` | Empty | Pellet passes through unchanged. |
| `\` | Mirror (backslash) | Turns the pellet 90°: right → down, down → right, left → up, up → left. Then flips to `/`. |
| `/` | Mirror (slash) | Turns the pellet 90°: right → up, up → right, left → down, down → left. Then flips to `\`. |
| `#` | Wall | Stops the pellet. |
| `%` | Breakable wall | Stops the pellet and breaks: it becomes empty, so later shots pass through. |
| `G` | Goal | Pellet reaches the goal; level complete. |
| `*` | Bonus target | Stops the pellet and is collected (becomes empty). Hidden (empty) until the level is completed at par; see *Bonus targets*. |

Mirrors are two-sided: a pellet is deflected from either side.

## Outcomes of a shot

| Outcome | When | Result |
|---|---|---|
| `goal` | Pellet enters the goal cell | Level complete |
| `bonus` | Pellet enters a bonus target | Target collected; next turn |
| `exit` | Pellet leaves the grid through any edge | Next turn |
| `blocked` | Pellet hits a wall (a breakable one breaks) | Next turn |
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
| 5 | Double take | 2 | Goal needs 2 hits. Row 3 climbs two mirrors into the goal, flipping them; that lets row 1 come down into the goal too. Repeating row 3 misses. Teaches the multi-hit goal. |
| 6 | Warm-up | 3 | Goal needs 2 hits. Row 3 first hits a wall (a setup shot), then climbs into the goal; that lets row 1 hit it too. First level needing three shots. |
| 7 | Down and around | 2 | Row 6 climbs column 1 and flips its corner mirrors; row 2 then runs down and around the board. |
| 8 | Third time lucky | 3 | Row 5 twice turns the pellet a step further each time; row 2 then loops to the goal. |
| 9 | Back and forth | 3 | Rows 4, 6, 4: two different setup shots, and a final shot that crosses its own path. |
| 10 | Two-step | 4 | Rows 3, 5, 3, 5: each shot flips mirrors the other row's next shot needs. |
| 11 | Breakthrough | 3 | Introduces breakable walls. Row 2 breaks the cracked wall in front of it, then runs through to flip the mirrors it needs, then reaches the goal: the same row three times, each shot changing the board. |
| 12 | Stone by stone | 4 | Rows 6, 7, 6, 7: three of the four shots break a cracked wall, opening the way for the next. |
| 13 | Crack and double | 3 | Breakable walls with a two-hit goal. Row 3 breaks the cracked wall in front of the goal; rows 5 and 2 then reach it through the gap. |
| 14 | Rubble run | 5 | Goal needs 2 hits. Rows 4, 2, 3, 4, 3: a miss sets up the mirrors, row 2 breaks a cracked wall, and rows 3 and 4 take turns reaching the goal. |
| 15 | Your move | 1 | Introduces the player-placed mirror (`/`). Row 4 runs along the bottom; the mirror in the corner below the goal turns it up into it. The bonus target needs the mirror somewhere else: row 1, then the mirror at (1,2), then row 2. |
| 16 | Double duty | 3 | Player mirror `/`, used twice. Row 2 first flips the mirror at (2,2); with the mirror placed at (3,4), row 2 then runs down and round, bouncing off it and flipping it; row 4 turns down at the flipped mirror and runs to the goal. The bonus target needs the mirror placed later: rows 5, 5, then the mirror at (5,3), then rows 1, 1. |
| 17 | Rebuild | 4 | Breakable walls, player mirror (`/`) and a two-hit goal together. Row 3 breaks the cracked wall at (4,5), and the mirror goes into the gap it leaves; row 5 then climbs to the goal, row 3 swings the mirrors back, and row 5 hits the goal again. The bonus target sits behind the cracked walls at the top: rows 3, 3, 5, 5, then the mirror at (5,4) and row 2. |

Levels 15–16 were found with `npm run generate -- --player-mirror slash`
(16 with `--place-later`), which keeps only boards that can't reach par
without the mirror; the tests check that too. Level 17 was found with
`--player-mirror slash --breakable 2 --goal-hits 2`, which also needs a
cracked wall broken. All three have a unique shortest solution.

Levels 11–14 were found with `npm run generate -- --breakable N`, which
keeps only boards that can't reach par with their breakable walls made
solid; the tests check that too. Levels 11–14 can't be solved at all that
way; level 17 can, in 6 shots, using the player mirror.

Levels 5–10 were found by searching random boards with the solver, keeping
ones with exactly one shortest solution, and choosing by readability and
variety of solutions. Levels 5–6 are deliberately small, to teach the
multi-hit goal, and come before the harder single-hit levels 7–10, so the
difficulty doesn't dip at the end.

## Controls

- **Mouse:** hovering over a launch position selects its row; clicking fires.
  In levels with a player mirror, hovering over an empty cell previews it
  and clicking places it; on touch screens, tap a cell twice.
- **Keyboard:** ↑/↓ (or W/S) select a row, Enter/Space fires. In levels with
  a player mirror, P shows a cell cursor: the arrow keys (or WASD) move it,
  P or Enter places the mirror there, Esc cancels.
- Music and sound effects are switched on and off separately: **M** or the
  *Music* label for music, **F** or the *Sounds* label for sound effects.
  Both choices are remembered. (Players who had muted all sound before the
  split start with both off.)
- After completing a level, Enter/Space or the *Next level* button continues.
  After the last level, it returns to the title screen.
  On a level completed or skipped before, the *Next level* button
  (outlined, not filled) is there from the start, so a player going for the bonus target
  can move on at any time; Enter/Space still fires until the level is
  completed again.
- **Esc** or the *Menu* label returns to the title screen at any time.
- **Skip button:** *Skip level · 3/3* at the bottom left skips a level
  not yet completed or skipped, on a second press within 3 seconds ("Press
  again to skip"), so a stray tap doesn't waste one. The player has 3
  skips. A skipped level counts as skipped, as with the hidden skip below.
  A used skip is given back (up to 3) the first time a level is completed
  and the first time a bonus target is collected; the message says "Skip
  returned (2/3)". Replaying a completed level or a collected bonus gives
  nothing, so skips can't be farmed. With none left the button reads "No
  skips left" until the player has spent 5 minutes on level screens
  after using the last one (the title screen and a hidden browser tab
  don't count); then one skip comes back and the button updates. That
  time is saved, so it adds up across visits. On levels already completed or skipped, the *Next level*
  button takes its place. Skips left are saved with the progress.
- **Hidden skip:** Shift+N, or pressing and holding the level name in the
  header for about 1.2 seconds (mouse or touch), moves on to the next level
  without completing the current one (from the last level: back to the
  title screen). Nothing in the game mentions it; it is a debugging aid,
  works on any level and uses none of the visible skips. A skipped level counts as
  not passed (no ✓, no star) and shows "skipped" in the level list, but it
  unlocks the level after it. Completing it later makes it an ordinary
  completed level. *Continue* on the title screen goes to the first level
  that is neither completed nor skipped, and only then back to skipped ones.
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
| Star | `#ffe08a` | Stars, par celebrations, golden stars |
| Bonus prism | `#ff5fd2` `#ffa45c` `#ffe08a` `#3dffb4` `#5fd8ff` `#a98bff` | Bonus target facets, its sparkles and bursts (the only multicoloured piece) |
| Wall | `#18233a`, edge `#34466b` | Walls |
| Stone | `#323846`, edge `#5d6680`, cracks `#0d111b` | Breakable walls |
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
- **Breakable walls**: lighter stone blocks with dark jagged cracks
  running through them instead of hatching, no glow. When hit, they burst
  into stone pieces that fall away and fade.
- **Goal**: a crystal (diamond within a diamond) glowing green.
- **Mirror preview** (where the player's mirror would go): four corner
  brackets around the cell and the mirror's outline in glass-coloured
  dashes, pulsing gently with the goal's breath; on a cell where it can't
  go, only dim brackets. A placed mirror drops in from slightly larger,
  fading in (220 ms), and then looks like any other mirror.
- **Bonus target**: a prism gem: a hexagon of six facets, one in each
  bonus colour, with a white rim and a bright core.
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
- The bonus target is livelier than the goal, so it is noticed when it
  appears: it turns slowly (once every 9 s, so its colours swirl), pulses
  faster and deeper (grows 16 % every 1.5 s) and gives off small
  four-pointed sparkles in its colours.
- When the player's system asks for reduced motion, all ambient motion stops;
  the pieces stay at rest.

### Readability

- Shot outcomes are shown by **shape** as well as colour, so they can be told
  apart without colour vision: reaching the goal turns the whole beam green;
  hitting a bonus target turns it gold;
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
| Breakable wall | A crunch over a low thud, with small pieces clattering after it (not from the sound lab) |
| Mirror placed | A glassy click, then two short bells (not from the sound lab) |
| Off the board | *Two-tone drop*: two notes stepping down |
| Loop | *Question chime*: two bells rising |
| Goal (above par) | *Crystal chime*: glassy notes rising |
| Par | *Chime and sparkle* |
| Final star | *Synth fanfare*: brassy chords stepping up into a bright chord |
| Bonus target | A quick glissando of bells up a pentatonic scale, then high sparkles (not from the sound lab) |
| Last bonus target | Like the final-star fanfare, with brighter major-seventh chords and bells on each chord (not from the sound lab) |

### Music

| Where | Track |
|---|---|
| Title screen | **Night lab**: calm synthwave, pads and an echoing arpeggio, 84 BPM |
| Levels 1–4 | **Pulse**: driving synthwave with a soft beat, 104 BPM |
| Levels 5–8 | **Glass garden**: a slow, dark ambient drone only (no melody), so it stays out of the way on the harder levels |
| Levels 9–17 | **Night lab**, as on the title screen |

Each level names its track (`music` in `src/levels/levels.ts`). Moving
between levels with the same track keeps the music playing; a different
track crossfades in over about a second.

### Mix

- Effects at 80 %, music at 45 % of their full level (balanced by ear).
- The music drops to a quarter during the par, final-star and bonus sounds
  (ducking), so they stand out.
- At most six effects play at once; extra ones are skipped (goal, par and
  final-star sounds always play).
- Fire, wall, breaking and off-the-board sounds vary in pitch by up to a
  quarter of a semitone, so repeats don't sound mechanical.
- Music and effects can each be switched off; their reverb and echo tails go
  silent with them.

## Future ideas (not yet designed)

- Firing from other edges of the grid.
- More block types (e.g. one-way blocks, splitters, rotating or breakable
  mirrors).
- More player-placed blocks: several mirrors, choosing or rotating the
  mirror's direction, or other kinds of blocks (see *Player-placed
  mirror*).
- Shot limits or par scores per level.
- Level select and progress saving.

## Open questions

- None at the moment. (Resolved: the board changes between shots because
  mirrors flip when hit.)
