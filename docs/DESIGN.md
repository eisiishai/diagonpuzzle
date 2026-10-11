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
- The crystal's core starts as an outline and fills from the bottom, a
  part per hit (half per hit for two hits); the header shows `GOAL 1/2`. A non-final hit says "Goal hit!
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
  turns golden in the level list, which also shows `GOLDEN ★ n/N` (N: levels
  with a bonus target, currently all 20) once there is at least one. The header shows `BONUS 0/1` while playing a
  level whose bonus target has appeared.
- **Last bonus target of the game: the ending.** Bonus targets appear only
  once a level is at par, so the last one is always the end of the game.
  Chosen on the finale lab page (2026-10-11):
  - The gem splits the beam into a fan of six rays in the bonus colours,
    appearing one by one with the fanfare's bells, turning slowly across
    the screen and fading after about 3.5 s. At the same time a ring in
    the six colours spreads over the board from the gem; every piece it
    passes flashes in the colour passing over it, and mirrors make a half
    turn, so the board is unchanged and play can go on.
  - Specks of coloured light drift up the screen instead of falling stars.
  - The banner "★ ALL BONUS TARGETS FOUND! ★" pops in white; a light sweeps
    across it, lighting each letter in a bonus colour, and a quiet second
    line, THANK YOU FOR PLAYING, fades in under it. It stays about 5 s,
    longer than the par banner.
  - With reduced motion the fan stands still, the wave and the drifting
    light are left out and the banner is lit at once.
  - Afterwards the title screen's header adds `ALL FOUND!` in the bonus
    colours, and the title beam ends in the bonus gem, which splits it
    into a small, still fan of the six colours.
- **Design checks.** Each level declares `bonusShots`, the fewest shots
  that hit its bonus target from the starting board without completing the
  level first (a non-final hit of a multi-hit goal is allowed). The tests
  check it with the solver (`solveBonus()`), check `minShots` with the
  bonus target removed (it is hidden until par), and check that par is
  still possible with the target showing. At most one per level for now.
- **Harder than par.** A bonus target needs more shots than par: one
  more on levels 2–9 and 11–18, two more on level 10. Only level 1's
  takes as few as par (1). A test checks `bonusShots` > `minShots` beyond level 1.
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
  It can't be turned (a rotate option was discarded: see *Discarded
  ideas* in `docs/ROADMAP.md`).
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

## Reflectors

A reflector (`@`) sends the pellet straight back the way it came, from
any side. It never changes itself, but every mirror the pellet bounced
off on the way in has flipped, so the return trip meets a different board
and goes somewhere new. That is the point of the piece: it shows the
player, within one shot, that a mirror is different after the pellet has
passed it.

- A pellet with nothing in its way on the way back simply retraces its
  path and leaves the board where it came in (at its launcher).
- A mirror hit on the way in and again on the way back flips twice, so it
  ends the shot as it started.
- Shots stay finite: every step can still be traced back uniquely (a
  pellet leaving a reflector moving left entered it moving right), so no
  loop is possible.
- The beam turns back at the reflector's ring, not its centre, with the
  mirror bounce's flash and sound.
- Levels 19–20 teach it (chapter *Reflectors*).

## Cell types

| Symbol | Name | Behavior |
|---|---|---|
| `.` | Empty | Pellet passes through unchanged. |
| `\` | Mirror (backslash) | Turns the pellet 90°: right → down, down → right, left → up, up → left. Then flips to `/`. |
| `/` | Mirror (slash) | Turns the pellet 90°: right → up, up → right, left → down, down → left. Then flips to `\`. |
| `#` | Wall | Stops the pellet. |
| `%` | Breakable wall | Stops the pellet and breaks: it becomes empty, so later shots pass through. |
| `@` | Reflector | Sends the pellet straight back the way it came: right → left, left → right, up → down, down → up. Never changes. See *Reflectors*. |
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

Most levels also have *alternative solutions* one shot above par: other
routes to the goal, so a player who strays from the par route can still
finish without restarting, while par stays a single route. Levels 3, 6, 8,
9, 13 and 18 got theirs on 2026-10-11 by one added mirror each (in
level 8 replacing a wall), levels 4 and 7 by two, in cells the par
solution never reaches (found with `npm run alternatives`, which lists
every level's alternatives).

Every level must have at least one alternative within two shots above
par (level 11's is two above: rows 3, 1, 3, 2, 2); the tests check it, and
`npm run generate` keeps only boards that have one.

| # | Level | Min shots | Idea |
|---|---|---|---|
| 1 | First light | 1 | Row 4 reaches the goal directly. Alternative: row 5 misses but flips three mirrors, after which row 1 gets through. |
| 2 | Up and over | 1 | Row 5 reaches the goal directly. Alternative: row 1 runs down column 3 and flips the mirrors at both ends; row 6 then runs back up it and round to the goal. |
| 3 | Second try | 2 | The first shot from row 2 flips the mirror at the edge; the same row then reaches the goal. Teaches flipping. Alternative in 3 shots: row 4 twice, the second time up and round through the top row, so that row 1 turns down at (3,1) and runs along row 2 to the goal. |
| 4 | Set the stage | 2 | A shot from row 4 flips two mirrors in column 4, which the next shot from row 3 needs. A different row must set up the board. Alternative in 3 shots: rows 2, 4, 5. |
| 5 | Double take | 2 | Goal needs 2 hits. Row 3 climbs two mirrors into the goal, flipping them; that lets row 1 come down into the goal too. Repeating row 3 misses. Teaches the multi-hit goal. |
| 6 | Warm-up | 3 | Goal needs 2 hits. Row 3 first hits a wall (a setup shot), then climbs into the goal; that lets row 1 hit it too. First level needing three shots. Alternative in 4 shots, after the same first goal hit: rows 4, 4 hit it a second time. |
| 7 | Down and around | 2 | Row 6 climbs column 1 and flips its corner mirrors; row 2 then runs down and around the board. Alternative in 3 shots: rows 3, 5, 3. |
| 8 | Third time lucky | 3 | Row 5 twice turns the pellet a step further each time; row 2 then loops to the goal. Alternative in 4 shots, after the same two row 5 shots: rows 6, 7. |
| 9 | Back and forth | 3 | Rows 4, 6, 4: two different setup shots, and a final shot that crosses its own path. Alternatives in 4 shots: rows 2, 4, 4, 4 and rows 4, 5, 5, 4. |
| 10 | Two-step | 4 | Rows 3, 5, 3, 5: each shot flips mirrors the other row's next shot needs. |
| 11 | Breakthrough | 3 | Introduces breakable walls. Row 2 breaks the cracked wall in front of it, then runs through to flip the mirrors it needs, then reaches the goal: the same row three times, each shot changing the board. |
| 12 | Stone by stone | 4 | Rows 6, 7, 6, 7: three of the four shots break a cracked wall, opening the way for the next. |
| 13 | Crack and double | 3 | Breakable walls with a two-hit goal. Row 3 breaks the cracked wall in front of the goal; rows 5 and 2 then reach it through the gap. Alternatives in 4 shots: rows 2, 3, 3, 5 and rows 5, 2, 5, 5. |
| 14 | Rubble run | 5 | Goal needs 2 hits. Rows 4, 2, 3, 4, 3: a miss sets up the mirrors, row 2 breaks a cracked wall, and rows 3 and 4 take turns reaching the goal. |
| 15 | Your move | 1 | Introduces the player-placed mirror (`/`). Row 4 runs along the bottom; the mirror in the corner below the goal turns it up into it. The bonus target needs the mirror somewhere else: row 1, then the mirror at (1,2), then row 2. |
| 16 | Double duty | 3 | Player mirror `/`, used twice. Row 2 first flips the mirror at (2,2); with the mirror placed at (3,4), row 2 then runs down and round, bouncing off it and flipping it; row 4 turns down at the flipped mirror and runs to the goal. The bonus target needs the mirror placed later: rows 5, 5, then the mirror at (5,3), then rows 1, 1. |
| 17 | Clear the way | 3 | Breakable walls, player mirror (`/`) and a two-hit goal together, in an easy first combination before level 18. Row 1 breaks the cracked wall in front of it; with the mirror placed at (5,2), row 1 then runs down and along into the mirror, which turns it up into the goal; the mirrors it flipped now take row 2 up and along to the goal. The bonus target needs the mirror at (4,2): rows 1, 5, 5, 1, the second row 5 setting up the mirrors that turn row 1 down to it. |
| 18 | Rebuild | 4 | Breakable walls, player mirror (`/`) and a two-hit goal together. Row 3 breaks the cracked wall at (4,5), and the mirror goes into the gap it leaves; row 5 then climbs to the goal, row 3 swings the mirrors back, and row 5 hits the goal again. The bonus target sits behind the cracked walls at the top: rows 3, 3, 5, 5, then the mirror at (5,4) and row 2. Four alternatives in 5 shots, e.g. rows 3, 5, 5, 3, then the mirror at (6,4) and row 2. |
| 19 | Return trip | 1 | Introduces reflectors. Row 3 turns up at the `/` at (2,3) into the reflector above it, comes back down into the same mirror, now `\`, and turns right to the goal; row 2 just comes straight back. Alternative in 2 shots: row 4 twice. The bonus target sits beside the reflector: row 1 turns down into the reflector and back up, flipping (3,1) on its way out; the second row 1 then turns down at (3,1) onto the target. |
| 20 | There and back | 2 | Two reflectors. Row 5 flips the mirrors at (2,5) and (2,2) on its way up and across; row 2 then turns down at (2,2), right at (2,5) and up at (4,5) into the reflector at (4,3), and comes back down into (4,5), now `\`, which turns it right to the goal. Alternative in 4 shots: row 2 four times. The bonus target needs both reflectors: rows 1, 3, 3, the last climbing column 1 and turning down at (5,1) into the reflector at (5,4), then back up and right off the flipped mirror. |

Levels 19–20 were found with `npm run generate -- --reflectors N`,
which keeps only boards that can't reach par with their reflectors made
walls (19 with `--reflectors 1 --shots 1 --require-setup` on a 5×4
board, 20 with `--reflectors 2 --shots 2 --no-repeat` on a 6×5 board);
both have a unique shortest solution. Their bonus targets were chosen
among `npm run bonus` placements (20's after one added mirror, at (1,3))
for routes that use the reflectors too.

Levels 15–16 were found with `npm run generate -- --player-mirror slash`
(16 with `--place-later`), which keeps only boards that can't reach par
without the mirror; the tests check that too. Levels 17–18 were found with
`--player-mirror slash --breakable 2 --goal-hits 2`, which also needs a
cracked wall broken (17 with `--shots 3` on a 5×5 board with 5 mirrors
and 1 wall, added after v1.0 to ease the step to 18). All four have a
unique shortest solution.

Levels 11–14 were found with `npm run generate -- --breakable N`, which
keeps only boards that can't reach par with their breakable walls made
solid; the tests check that too. Levels 11–14 can't be solved at all that
way; levels 17 and 18 can, in 8 and 6 shots, using the player mirror.

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
  works on any level and uses none of the visible skips. It stays in the
  release build on purpose: testers use it to reach any level on the
  deployed game, so don't limit it to development builds. A skipped level counts as
  not passed (no ✓, no star) and shows "skipped" in the level list, but it
  unlocks the level after it. Completing it later makes it an ordinary
  completed level. *Continue* on the title screen goes to the first level
  that is neither completed nor skipped, and only then back to skipped ones.
- A new shot can't be fired while the pellet is still moving.

## Title screen and progress

- The title screen shows the game's name ("Diagon Puzzle", a working title),
  a *Play* button and the level list. Navigate with the arrow keys and
  Enter, or the mouse: left and right move along a row of tiles and on to
  the next row, up and down between rows and buttons.
- The browser tab shows the same name, with the goal crystal as its icon
  (`public/favicon.svg`, and a 32×32 PNG for browsers without SVG icons).
  The PNG was drawn from the same shapes by a one-off script that was not
  kept: if the icon changes, export the SVG to PNG again.
- *Play* starts the first uncompleted level and reads *Continue: level N* once
  some levels are completed, or *Play again from level 1* when all are.
- Level 1 is always unlocked; each further level unlocks when the previous one
  is completed. Locked levels are shown but can't be selected.
- Completed levels show the best (lowest) shot count. Completing a level again
  reports a new best or the existing one.
- The level list is split into **chapters**, one per mechanic (`CHAPTERS`
  in `src/levels/levels.ts`, following the music groups): 1–4 *Basics*,
  5–10 *Flip tricks*, 11–14 *Breakable walls*, 15–18 *Your mirror*,
  19–20 *Reflectors*. Each
  chapter is a row of square level tiles (at most six) with a label: its
  number, name in capitals, and stars earned in it (`★ 3/4`, or
  `locked`). The label sits left of the tiles on a wide screen and on one
  line above them on a narrow one (a phone), so the screen keeps its full
  size on a desktop. Chosen on the level list lab page (2026-10-11), when
  one row per level had shrunk the screen's text with every level added.
- Each tile shows the level's number and, below it, its state by shape
  and colour: a white ★ for a level completed at par, a gold ★ once its
  bonus targets are all collected (golden), a green ✓ for completed above
  par, a beam-coloured ▶ for unlocked and not yet played, a double chevron
  for skipped, and a lock for locked (dimmed). A line under the chapters
  shows the selected (or hovered) level's numbered name and its score in
  the number font (`best 4 / par 3`, `par 3`, or `skipped · par 4`); it
  starts on the level *Play* would start.
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
- Changing a released level does affect saves: stars compare the saved
  best shots with the level's current par, so lowering its par removes
  stars, and moving its bonus target moves collected ones (they are
  saved by index).
- The game's version (e.g. `v0.9`) is shown in small text at the bottom of the
  title screen.

## Presentation

- **Presentation stays unobtrusive.** Players solve many levels in a row,
  so nothing should pull attention away from the puzzle: level music is
  calm ambient, sounds heard on every shot or level are quiet and soft, and
  animations are one-off moments (a transition, a hit) rather than
  repeating eye-catchers. A variant that sounds or looks fine once on a lab
  page can wear in long play, so lean quieter and rarer. Tried and found
  too much: beat-driven level music, a rising level-start sweep, and the
  title beam firing every few seconds.
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
canvas; the second pass of effects was chosen on the visual lab page.
Colours and fonts are defined once in `src/render/theme.ts`.

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
| Marking | `#2f4670`, labels `#6482b0` | Corner ticks and labels around the board |

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
- **Reflectors**: a round glass ring on a dark disc, with the three
  facet lines of a corner cube (a Y) and a bright centre dot, glowing
  pale blue like the mirrors. The beam turns back at the ring.
- **Breakable walls**: lighter stone blocks with dark jagged cracks
  running through them instead of hatching, no glow. When hit, they burst
  into stone pieces that fall away and fade.
- **Goal**: a crystal (diamond within a diamond) glowing green. A goal
  needing several hits has an outlined core that fills from the bottom,
  a part per hit.
- **Mirror preview** (where the player's mirror would go): four corner
  brackets around the cell and the mirror's outline in glass-coloured
  dashes, pulsing gently with the goal's breath; on a cell where it can't
  go, only dim brackets. A placed mirror drops in from slightly larger,
  fading in (220 ms), and then looks like any other mirror.
- **Bonus target**: a prism gem: a hexagon of six facets, one in each
  bonus colour, with a white rim and a bright core.
- **Beam**: a glowing coloured band with a thin white core. While it
  travels, its front is a glowing dot with a short fading comet tail
  (about ¾ of a cell), and the panel under its path is faintly lit in the
  beam's colour, brightest in a soft glow around the front. The light
  stays after the shot: green for the goal, gold for a bonus target,
  dimmer for a miss.
- **Surroundings**: a soft vignette darkens the background towards the
  screen's corners (under every screen, never over its text); on level
  screens a faint blue light sits behind the board, and small corner
  ticks outside the panel carry quiet labels: grid size (top left), goal
  hits needed (top right), par (bottom left) and level number (bottom
  right, `L07`). They don't glow, and fade in with the panel at level
  start.
- **Buttons**: rounded rectangles with a thin outline; the primary action
  (*Next level*) is filled with the success colour. The selected or hovered
  button eases in a soft halo (0.12 s) in its accent colour (beam colour,
  or the success colour for the primary button); pressing one squeezes it
  slightly (97 %).

### Light and motion

- Glow comes from a bloom effect on the board: only bright things glow
  (beam, mirrors, goal, selected emitter); the panel and grid stay dark.
- Mirrors turn 90° in 150 ms when hit; the beam travels about 9 cells a
  second.
- **Scene transitions** are a beam wipe: a laser line (beam colour, white
  core) sweeps across the screen in 0.5 s, revealing the new screen behind
  it while the old one still shows ahead of it. Into a level it sweeps
  left to right; back to the title screen, right to left. The new screen
  takes input at once.
- **Level start**: the board builds in, sweeping left to right like the
  beam. The panel fades in, the emitters slide in from the left one row
  after another, the cells pop in column by column (slightly overshooting
  their size), and the goal ignites last: it shrinks into place from
  larger with a flash and a diamond ring spreading from it. It takes
  about 0.7 s on a 7-column board; firing or placing the mirror ends it at
  once. Restarting a level doesn't play it again.
- Celebrations use star-shaped particles in the star and success colours.
- **Hit feedback** along the beam:
  - Where it reflects, a short pale-blue flash with a white centre
    (0.17 s), and a bright spot runs along the glass as the mirror turns
    (0.26 s).
  - At a wall, five short sparks bounce back the way the beam came and
    fall away (about 0.25 s), next to the × marker.
  - A breaking wall also shakes the board by up to 2 px, fading out over
    0.22 s.
  - Every goal hit, not only one at par, flashes the crystal and sends out
    a diamond-shaped ring (0.45 s); par still adds its stars on top. A hit
    on a bonus target only turns the beam gold, as before.
- Ambient motion, kept slow and subtle so it never distracts from puzzling:
  the goal crystal breathes (grows about 7 % and brightens, every 2.4 s), the
  selected emitter's glow pulses at the same pace, the crystal under the
  title pulses like the goal, and a faint grid behind every screen drifts
  very slowly down and to the right (1.5 px a second: one grid square in
  about half a minute). Its lines are one screen pixel wide, on the screen's
  pixel grid, and it moves in whole screen pixels, so it stays crisp without
  shimmering.
- **Title beam**: as the title screen appears, the beam under the title
  fires once: it shoots across from the left (0.42 s), the title's glow
  flares as it passes under it, and the crystal at its end flashes on
  arrival; then it stays still. (Firing every few seconds was too
  distracting.) With reduced motion the beam is simply drawn in full.
  Once every bonus target is found, the crystal is the bonus gem, and its
  fan of colours grows out of it as the beam arrives.
- The bonus target is livelier than the goal, so it is noticed when it
  appears: it turns slowly (once every 9 s, so its colours swirl), pulses
  faster and deeper (grows 16 % every 1.5 s) and gives off small
  four-pointed sparkles in its colours.
- When the player's system asks for reduced motion, all ambient motion stops;
  the pieces stay at rest. Screens then change with a plain cut, and the
  board appears without building in. Hits keep their flashes but lose the
  glint, sparks, shake and the goal's ring.

### Readability

- Shot outcomes are shown by **shape** as well as colour, so they can be told
  apart without colour vision: reaching the goal turns the whole beam green;
  hitting a bonus target turns it gold;
  a miss dims the beam and marks where it ended: an **×** at a wall, an
  open **chevron** pointing off the board where it left, a **ring** for a
  loop.
- Glow never replaces outlines: every piece is recognisable with the bloom
  turned off.
- **Ghost of the previous shot**: when a new shot fires, the one before it
  stays as a ghost until the shot after: a very dim band in the beam's
  colour under the pieces, with small chevrons every 1.5 cells pointing the
  way it went. It has no bright core or end marker, so it reads as the
  past shot, not the current one. It fades in over 0.25 s and stays at
  half strength while the new beam travels, so the beam leads; it is
  cleared on restart. It helps players see what the last shot did and
  which mirrors it turned, which makes puzzles a little easier to reason
  about; that was accepted.

## Sound

All sound is synthesized in code with the Web Audio API: no audio files.
Effects and music were chosen by ear on the sound lab page (an artifact with
every variant), so the names below are its variant names; later choices
came from sound lab 2. Sound lab 3 then reviewed the effects for long play:
fire, bounce, wall, breaking wall, off the board, loop, goal, par and mirror
placed are its *Softer* versions, the same sounds about 30–40 % quieter and
a little rounder, so they don't wear on the ear over many levels. The rare
celebrations (final star, bonus targets) keep their full level.

### Effects

| Event | Sound |
|---|---|
| Fire | *Soft pulse*: a gentle falling tone with a breath of air |
| Mirror bounce | *Crystal ping*: a small bell; each further bounce in a shot is one note higher on the music's scale, from E5 (capped after ten), so long shots stay in key. With a quiet glassy swish as the mirror turns (sound lab 2) |
| Wall | *Soft knock* |
| Breakable wall | A crunch over a low thud, with small pieces clattering after it (not from the sound lab) |
| Mirror placed | A glassy click, then two short bells (not from the sound lab) |
| Selection moved | *Soft tick* (sound lab 2), quieter: when the arrow keys change the selected row or menu item |
| Button pressed | *Glass tap* (sound lab 2), quieter: a click with a small bell, for every button and for Enter on the title screen or after completing a level |
| Level start | A soft, quiet swoosh of air with the beam wipe, without a tone, so it doesn't wear on the ear over many levels (sound lab 2's *Rising sweep* was too noticeable) |
| Off the board | *Two-tone drop*: two notes stepping down |
| Loop | *Question chime*: two bells rising |
| Goal (above par) | *Crystal chime*: glassy notes rising: root, third, fifth and octave of the chord the music is playing (root and fifths when neither the chord nor the scale has a third) |
| Par | *Chime and sparkle*: the same chime on the music's chord, then high sparkles |
| Final star | *Synth fanfare*: brassy chords stepping up into a bright chord |
| Bonus target | A quick glissando of bells up a pentatonic scale, then high sparkles (not from the sound lab) |
| Last bonus target, the ending | *Prism bells* (finale lab): six bells rising through the music's key made major, one with each ray of the prism fan, then a chord on that major tonic that swells and opens up, with a few high notes. The music rests under it (see Mix) |

### Music

| Where | Track |
|---|---|
| Title screen | **Night lab**: calm synthwave, pads and an echoing arpeggio, 84 BPM |
| Levels 1–4 (basics) | **Afterglow**: warm pads whose filter slowly opens and closes, a soft sine bass, an occasional echoing pluck. Am9 – Fmaj7 – Cmaj7 – G6, a chord every 8 s |
| Levels 5–10 (multi-hit goals, harder flips) | **Glass garden**: a slow, dark drone with a soft bell now and then; the calmest track, for the hardest levels before breakable walls |
| Levels 11–14 (breakable walls) | **Prism drift**: two swaying chords (Fmaj7♯11 – Cmaj9), a faint high shimmer, glassy bells now and then with a long tail |
| Levels 15–18 (player mirror) | **Photon**: dark pads and sub bass on Em9 – Cmaj9, crossed now and then by a soft gliding tone with a long echo, like a slow laser streak |
| Levels 19–20 (reflectors) | **Afterglow** again for now, the calm track of the basics, as these levels teach a new piece from the start; a track of their own may follow |

Level music is background to think to: no drums and no tune to follow,
chords that change only every 8–9 seconds, and small details (plucks,
bells, glides) placed at random so the loop is hard to notice. The title
screen can be livelier. A track change marks a new mechanic, so new levels
take the track of their mechanic's group. (Livelier drafts with beats and
tunes were tried on sound lab 2 and found too distracting.)

Each level names its track (`music` in `src/levels/levels.ts`). Moving
between levels with the same track keeps the music playing; a different
track crossfades in over about a second.

### Mix

- Effects at 80 %, music at 45 % of their full level (balanced by ear).
- The music drops to a quarter during the par, final-star and bonus sounds
  (ducking), so they stand out. Under the ending (last bonus target) it
  rests instead: it fades out, stays silent until two seconds after the
  fanfare, and comes back over four seconds, so the ending sounds like the
  end of a piece.
- At most six effects play at once; extra ones are skipped (goal, par and
  final-star sounds always play).
- Bounces, wall hits and breaks come from where they happen: they are
  panned by board column, up to 40 % to either side.
- Fire, wall, breaking, off-the-board and level-start sounds vary in pitch
  by up to a quarter of a semitone, so repeats don't sound mechanical.
- Music and effects can each be switched off; their reverb and echo tails go
  silent with them.

## Future ideas (not yet designed)

- More block types (e.g. fixed, glass or linked mirrors, reflectors,
  portals, one-way gates, switches and doors; listed in
  `docs/ROADMAP.md`).
- More player-placed blocks: several mirrors, or other kinds of blocks
  (see *Player-placed mirror*).
- Shot limits or par scores per level.
- Level select and progress saving.

## Open questions

- None at the moment. (Resolved: the board changes between shots because
  mirrors flip when hit.)
