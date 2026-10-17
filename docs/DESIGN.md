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

- **Hidden until par.** A level's bonus target appears once the level
  has been completed at par: on the visit that first reaches par it
  appears with the next *Restart* (the board in play stays as it is until
  then), and on every later visit from the start. Until then its cell is
  empty.
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
  with a bonus target, currently all of them) once there is at least one. The header shows `BONUS 0/1` while playing a
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
  more on levels 2–9 and 11–20, two more on level 10. Only level 1's
  takes as few as par (1). A test checks `bonusShots` > `minShots` beyond level 1.
  To get there, levels 3–5 and 7–10 each got one extra mirror (on level
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
  mirror bounce's flash and its own *Echo ping* (see Sound).
- Levels 21–25 teach it (chapter *Reflectors*), 23 with breakable walls,
  24 with the player's mirror and 25 with a two-hit goal; level 28
  combines it with glass mirrors.

## Glass mirrors

A glass mirror (`N` for `\`, `Z` for `/` in level grids) turns the pellet
like an ordinary mirror, once: instead of flipping, it shatters and
leaves an empty cell. It is the mirror version of the breakable wall, and
asks which shot should spend it.

- It shatters at the moment of the hit, so a pellet that comes back to its
  cell in the same shot (e.g. from a reflector) passes straight through.
- Shots stay finite: every step can still be traced back uniquely.
- When it shatters, it bursts into glass shards that fall away (like a
  breaking wall's stone pieces), with the mirror bounce's flash and a
  *Crack and tinkle* (see Sound).
- Levels 26–30 teach it (chapter *Glass mirrors*), 28 with a reflector,
  29 with a two-hit goal and 30 with breakable walls.

## Fixed mirrors

A fixed mirror (`L` for `\`, `J` for `/` in level grids) turns the pellet
like an ordinary mirror, and never flips. It is drawn in matte steel,
bolted down at both ends, so it reads as the one piece that stays put
while the glass mirrors around it flip.

- A shot that comes back to it, or a later shot from any side, meets it
  turned the same way: where a mirror would have flipped and sent the
  pellet elsewhere, it sends it the same way again. Levels are built
  around that: with their fixed mirrors made ordinary ones, par is out of
  reach (the tests check it).
- It has no state of its own, so it doesn't add to the solver's search.
- Shots stay finite: every step can still be traced back uniquely.
- Its bounce flashes like a mirror's, with its own *Anvil ring* (see
  Sound) on the bounce ladder; with nothing turning, there is no glint
  along it and no swish.
- Levels 31–35 teach it (chapter *Fixed mirrors*), 33 with a two-hit
  goal, 34 with breakable walls and a reflector, 35 with the player's
  mirror and a glass mirror.

## Portals

A level may have one pair of portals (`O` in level grids; a grid has two
or none). A pellet that enters either portal, from any side, comes out of
the other one moving the same way, and goes on from there. Portals never
change. They reach rows and routes the left edge can't: a pocket walled
off from the left, or the goal from above.

- Coming out of a portal, the pellet starts in the next cell beyond it, so
  it doesn't go into the same portal again. A later step of the same shot
  may enter either portal again, from any side.
- Mirrors on both sides keep flipping as usual, so the same portal shot
  can go somewhere new after a setup shot changes the mirrors before or
  after it.
- It has no state of its own, so it doesn't add to the solver's search.
- Shots stay finite: every step can still be traced back uniquely (a
  pellet leaving a portal moving right entered the other one moving
  right), so no loop is possible.
- The beam stops at the centre of the portal it enters and starts again
  at the centre of the other one; nothing is drawn between them. Both
  portals flash as the pellet goes through, which counts on the bounce
  ladder like a bounce, with its own *Phase drop* (see Sound): it starts
  at the portal the pellet goes into and ends at the one it comes out
  of.
- The player's mirror can't go on a portal (only on empty cells).
- One pair per level for now; several pairs would need a symbol and a
  colour per pair.
- Levels 36–40 teach it (chapter *Portals*), 38 with a breakable wall,
  39 with a reflector, which sends the pellet back through the
  portals, and 40 with a glass mirror and a fixed mirror. Their bonus targets need the portals too: with the
  portals made walls, out of reach however many shots are fired (the
  tests check it). *Other side* (36) got a new bonus target for this
  after its release (2026-10-17): its first, in the top right corner,
  could be reached without the portals in 5 shots. A player who
  collected it keeps it, as targets are saved by index. A bonus target
  needs its own chapter's piece: portals in a later chapter's level (44)
  leave the bonus target to that chapter's piece.

## One-way gates

A one-way gate (`>` `<` `^` `v` in level grids, after the way the arrow
points) lets the pellet through moving the way its arrow points, and
stops it like a wall when it comes from any other side: head-on or from
either side. It never changes. Gates close off routes: a shot that would
find a short way to the goal is stopped, while another gets through in
the gate's direction.

- Passing a gate is like passing an empty cell; being stopped by one is
  like hitting a wall (outcome `blocked`, the wall's sparks and *Soft
  knock*), with the message "A one-way gate stopped the pellet from the
  wrong side."
- A reflector behind a gate sends the pellet back into the gate's back,
  which stops it: the gate lets light in but not out.
- It has no state of its own, so it doesn't add to the solver's search.
- Shots stay finite: passing changes nothing and a stop ends the shot, so
  every step can still be traced back uniquely.
- Levels are built around both of its sides: with every gate a wall, par
  is out of reach (the pellet must pass one), and with every gate taken
  away, par is lower or reached more ways (one stops a pellet that would
  otherwise get through). The tests check both; `npm run generate --
  --gates N` keeps only such boards, and `npm run bonus` and `npm run
  alternatives` keep both when they change a board.
- The player's mirror can't go on a gate (only on empty cells).
- Bonus targets in gate levels need a gate passed too: with every gate a
  wall, the bonus target is out of reach however many shots are fired,
  so no longer way round the gates gets there either (the tests check
  it; `npm run bonus -- --needs gate`, which searches until no new board
  is left).
- Levels 41–42 teach it (chapter *One-way gates*), 43 adds a
  reflector and a breakable wall, and 44 portals and a two-hit goal. It borrows the wall's
  knock and the *Photon* track until it has its own (see Sound).

## Cell types

| Symbol | Name | Behavior |
|---|---|---|
| `.` | Empty | Pellet passes through unchanged. |
| `\` | Mirror (backslash) | Turns the pellet 90°: right → down, down → right, left → up, up → left. Then flips to `/`. |
| `/` | Mirror (slash) | Turns the pellet 90°: right → up, up → right, left → down, down → left. Then flips to `\`. |
| `#` | Wall | Stops the pellet. |
| `%` | Breakable wall | Stops the pellet and breaks: it becomes empty, so later shots pass through. |
| `N` `Z` | Glass mirror (`\`, `/`) | Turns the pellet like the mirror of the same direction (`N` like `\`, `Z` like `/`, after the letters' diagonals), then shatters: it becomes empty. See *Glass mirrors*. |
| `L` `J` | Fixed mirror (`\`, `/`) | Turns the pellet like the mirror of the same direction (`L` like `\`, `J` like `/`), and never flips. See *Fixed mirrors*. |
| `O` | Portal | The pellet comes out of the level's other portal, moving the same way; a level has two or none. Never changes. See *Portals*. |
| `>` `<` `^` `v` | One-way gate | Lets the pellet through moving the way the arrow points (`>` right, `<` left, `^` up, `v` down); stops it like a wall from any other side. Never changes. See *One-way gates*. |
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
finish without restarting, while par stays a single route. Levels 3, 7, 8,
9, 14 and 19 got theirs on 2026-10-11 by one added mirror each (in
level 8 replacing a wall), levels 4 and 5 by two, in cells the par
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
| 5 | Down and around | 2 | Row 6 climbs column 1 and flips its corner mirrors; row 2 then runs down and around the board. Alternative in 3 shots: rows 3, 5, 3. |
| 6 | Double take | 2 | Goal needs 2 hits. Row 3 climbs two mirrors into the goal, flipping them; that lets row 1 come down into the goal too. Repeating row 3 misses. Teaches the multi-hit goal. |
| 7 | Warm-up | 3 | Goal needs 2 hits. Row 3 first hits a wall (a setup shot), then climbs into the goal; that lets row 1 hit it too. First level needing three shots. Alternative in 4 shots, after the same first goal hit: rows 4, 4 hit it a second time. |
| 8 | Third time lucky | 3 | Row 5 twice turns the pellet a step further each time; row 2 then loops to the goal. Alternative in 4 shots, after the same two row 5 shots: rows 6, 7. |
| 9 | Back and forth | 3 | Rows 4, 6, 4: two different setup shots, and a final shot that crosses its own path. Alternatives in 4 shots: rows 2, 4, 4, 4 and rows 4, 5, 5, 4. |
| 10 | Two-step | 4 | Rows 3, 5, 3, 5: each shot flips mirrors the other row's next shot needs. |
| 11 | Breakthrough | 3 | Introduces breakable walls. Row 2 breaks the cracked wall in front of it, then runs through to flip the mirrors it needs, then reaches the goal: the same row three times, each shot changing the board. |
| 12 | Trapdoor | 4 | Two cracked walls, broken by different rows. Row 3 knocks out the cracked wall at the left edge, opening column 1; row 2 then turns down column 1 through the gap and along the bottom row into the second cracked wall, breaking it, but flips the corner mirrors at (1,2) and (1,5) on the way. Row 5 climbs column 1 and flips them back, and row 2 makes the same trip again, along the cleared bottom row to the goal. Alternative in 5 shots: rows 2, 2, 2, 5, 2, row 2 breaking the first wall itself, which costs a shot to repair. The bonus target, beside the goal column, uses the top mirrors the par route never touches: rows 1, 4, 4, 1, 4. |
| 13 | Stone by stone | 4 | Rows 6, 7, 6, 7: three of the four shots break a cracked wall, opening the way for the next. |
| 14 | Crack and double | 3 | Breakable walls with a two-hit goal. Row 3 breaks the cracked wall in front of the goal; rows 5 and 2 then reach it through the gap. Alternatives in 4 shots: rows 2, 3, 3, 5 and rows 5, 2, 5, 5. |
| 15 | Rubble run | 5 | Goal needs 2 hits. Rows 4, 2, 3, 4, 3: a miss sets up the mirrors, row 2 breaks a cracked wall, and rows 3 and 4 take turns reaching the goal. |
| 16 | Your move | 1 | Introduces the player-placed mirror (`/`). Row 4 runs along the bottom; the mirror in the corner below the goal turns it up into it. The bonus target needs the mirror somewhere else: row 1, then the mirror at (1,2), then row 2. |
| 17 | Hairpin | 2 | Player mirror `/` with a setup shot. Row 5 runs along the bottom and up column 5, flipping (5,5) and (5,2). With the mirror placed at (4,2), in the middle of the board, row 4 turns up column 4 into it, right into the flipped (5,2), down column 5 and right at the flipped (5,5) into the goal: a hairpin around the player's mirror. Alternative in 4 shots: rows 2, 2, the mirror at (5,3), rows 5, 2. The bonus target needs the mirror elsewhere, at (4,1): then row 4 three times. |
| 18 | Double duty | 3 | Player mirror `/`, used twice. Row 2 first flips the mirror at (2,2); with the mirror placed at (3,4), row 2 then runs down and round, bouncing off it and flipping it; row 4 turns down at the flipped mirror and runs to the goal. The bonus target needs the mirror placed later: rows 5, 5, then the mirror at (5,3), then rows 1, 1. |
| 19 | Clear the way | 3 | Breakable walls, player mirror (`/`) and a two-hit goal together, in an easy first combination before level 20. Row 1 breaks the cracked wall in front of it; with the mirror placed at (5,2), row 1 then runs down and along into the mirror, which turns it up into the goal; the mirrors it flipped now take row 2 up and along to the goal. The bonus target needs the mirror at (4,2): rows 1, 5, 5, 1, the second row 5 setting up the mirrors that turn row 1 down to it. |
| 20 | Rebuild | 4 | Breakable walls, player mirror (`/`) and a two-hit goal together. Row 3 breaks the cracked wall at (4,5), and the mirror goes into the gap it leaves; row 5 then climbs to the goal, row 3 swings the mirrors back, and row 5 hits the goal again. The bonus target sits behind the cracked walls at the top: rows 3, 3, 5, 5, then the mirror at (5,4) and row 2. Four alternatives in 5 shots, e.g. rows 3, 5, 5, 3, then the mirror at (6,4) and row 2. |
| 21 | Return trip | 1 | Introduces reflectors. Row 3 turns up at the `/` at (2,3) into the reflector above it, comes back down into the same mirror, now `\`, and turns right to the goal; row 2 just comes straight back. Alternative in 2 shots: row 4 twice. The bonus target sits beside the reflector: row 1 turns down into the reflector and back up, flipping (3,1) on its way out; the second row 1 then turns down at (3,1) onto the target. |
| 22 | There and back | 2 | Two reflectors. Row 5 flips the mirrors at (2,5) and (2,2) on its way up and across; row 2 then turns down at (2,2), right at (2,5) and up at (4,5) into the reflector at (4,3), and comes back down into (4,5), now `\`, which turns it right to the goal. Alternative in 4 shots: row 2 four times. The bonus target needs both reflectors: rows 1, 3, 3, the last climbing column 1 and turning down at (5,1) into the reflector at (5,4), then back up and right off the flipped mirror. |
| 23 | Ricochet | 3 | Reflector with breakable walls. Row 3 climbs column 3 into the reflector at the top and comes back down into the mirror at (3,5), which it flipped on the way up, so it turns right and breaks the cracked wall at (4,5). Row 5 swings back the two mirrors in column 1 that the first shot turned, and row 3 makes the same trip again, through the gap to the goal. Alternative in 5 shots: rows 3, 3, 3, 2, 3. The bonus target sits behind a second cracked wall: rows 3, 3, 2, 3, the second shot breaking that wall. |
| 24 | Mirror image | 3 | Reflector with the player's mirror (`\`). Row 4 climbs to (4,2), turns down into the reflector, comes back up and turns right, and leaves the board upwards at (5,2), flipping it; row 2 sets the mirrors in column 2 back. With the mirror placed at (5,3), row 4 makes the same trip, but (5,2) now turns it down onto the mirror, which turns it right to the goal. Alternative in 4 shots: row 4, the mirror at (6,4), rows 2, 4, 2. The bonus target, beside the top of the goal column, needs the mirror at (5,4): rows 4, 2, then the mirror, then rows 4, 2. |
| 25 | Double back | 4 | Reflector with a two-hit goal. Every row 2 shot turns down at (1,2) into the reflector below, comes straight back up into the same mirror, which it has just flipped, and turns right along row 2. The first time it turns up at (4,2) and leaves at the top, flipping it; the second time (4,2) turns it down, and (4,3) right into the goal. Row 3 swings (4,3) and (4,2) back, and row 2 makes the same trip to the goal again. Alternative in 5 shots: rows 1, 2, 2, 3, 1. The bonus target, below the mirror at (3,4), needs the reflector: rows 1, 1, 2, 1, 2, the last running along the top row, down column 3 and left at (3,4) into the reflector, which sends it back into (3,4), now flipped, and down onto the target. |
| 26 | Glass house | 2 | Introduces glass mirrors. The glass `/` in front of the goal turns row 2 up and away, and shatters; row 2 then runs straight through the gap to the goal. Alternative in 4 shots: rows 1, 3, 3, 2, the third shot shattering the glass from above. The bonus target sits under the glass: rows 2, 3, 1, 3, the last shot dropping through the gap onto it. |
| 27 | Clean break | 3 | Two glass mirrors in front of the goal. Row 5 climbs to them, and they turn it back left, a U-turn, shattering both; row 3 swings the mirrors at (3,3) and (3,5) back, and row 5 then climbs and runs right through the gap to the goal. Alternative in 4 shots: rows 3, 4, 4, 5. The bonus target sits beside the goal: rows 2, 4, 5, 4, the last shot running along row 2 through the gap left by the glass `\`. |
| 28 | Glass echo | 3 | Glass mirrors with a reflector. Row 3 turns up at (4,2) into the glass `\` at (4,1), which turns it away and shatters; row 2 sets the mirrors in column 1 back. Row 3 then turns down at (4,2), now flipped, into the glass `/` at (4,5), which turns it left, shattering, into the reflector in the corner; the reflector sends it straight back, through the gap, to the goal. Alternative in 5 shots: row 3 five times. The bonus target sits above the first glass mirror's gap: rows 3, 3, 4, 4, the last shot sent back by the reflector, up column 3 and right along the top row through the first glass mirror's gap. |
| 29 | Double glazing | 4 | Glass mirrors with a two-hit goal. Row 1 flips the two mirrors in column 4; row 3 then turns up at (3,3) into the glass `/` at (3,2), which turns it right, shattering, and up column 4 into the goal (flipping them back). Row 1 flips them again, and row 2 runs straight through the gap the glass left and up column 4 to hit the goal a second time. Alternative in 5 shots: rows 1, 2, 2, 1, 2. The bonus target sits on the bottom row: rows 4, 4, 4, 5, 4, the third shot shattering the glass `/` at (2,5) and the last running through its gap. |
| 30 | Glass and stone | 4 | Glass mirrors with breakable walls, each shot using a different piece. Row 2 breaks the cracked wall at the left edge. Row 1 turns down column 1 through the gap into the glass `\` at (1,3), which turns it right and shatters; (4,3) and (4,2) take it up and right into the second cracked wall, breaking it. Row 2 runs along the opened row 2 and is turned down and right by (4,2) and (4,3), flipped by row 1, into the glass `/` at (5,3), which shatters, and swings them back on the way. Row 3 then runs along row 3 through the first glass mirror's gap, turns up and right at (4,3) and (4,2) and passes through the broken wall to the goal. Alternative in 5 shots: rows 1, 1, 1, 2, 3. The bonus target, below the goal, needs the glass: rows 1, 2, 4, 4, 2, the last running through the gap the glass `/` at (5,3) leaves. |
| 31 | Bolted down | 2 | Introduces fixed mirrors. Row 3 runs into the fixed `/` at (4,3), which turns it up column 4; the mirrors at (4,1) and (2,1) turn it left and up, out of the board, and flip. The second row 3 shot meets the fixed mirror turned the same way, and the flipped (4,1) now turns it right to the goal. Alternative in 4 shots: rows 1, 4, 4, 3. The bonus target, beside the goal column above the fixed mirror, needs three different rows: 1, 2 and 3, the last turning up at the fixed mirror and winding round the board onto it. |
| 32 | Cold steel | 3 | Two fixed mirrors. Row 2 winds through the middle, turning down at the fixed `/` at (4,2), flipping five mirrors and hitting the wall at (3,4); row 3 turns up at (2,3) and right at (2,2) into the same fixed mirror from the other side, which sends it up and out; row 2 then runs along row 3 and turns down at (5,3) into the fixed `\` at (5,4), which turns it right to the goal. Alternative in 4 shots: rows 1, 4, 4, 2. The bonus target, below the fixed `\`, needs rows 1, 2, 4, 4, the last climbing column 1 and running through both fixed mirrors onto it. |
| 33 | Strike twice | 4 | Fixed mirrors with a two-hit goal. Row 2 turns up at (4,2) into the fixed `\` at (4,1), which sends it left; it turns down column 3 and left at (3,4) into the fixed `/` at (1,4), which turns it down into the wall. That flips (3,1) and (3,4), so row 1 now turns down column 3 and right along row 4 into the goal, flipping them back. Row 4 enters through the fixed `/` at (1,4), winds up through the middle into the fixed `\` at (4,1), comes back down column 3 and meets the fixed `/` at (1,4) a second time, turned the same way, into the wall; it flips (3,1) and (3,4) again, and row 1 hits the goal a second time. Alternative in 5 shots: rows 1, 1, 2, 1, 4. The bonus target, above the goal in its column, needs the fixed mirrors: rows 4, 3, 4, 3, 4, the last turning up at the fixed `/` at (1,4), right along row 3, and up and right at (5,3) and (5,2) onto it. |
| 34 | Steel echo | 3 | Fixed mirrors with breakable walls and a reflector. Row 3 climbs column 1 and leaves at the top, flipping three mirrors. Row 1 then turns down column 1 and right at (1,3) into the reflector, which sends it back into the same mirror, now `/`; it turns down onto the fixed `\` at (1,4), which turns it right along row 4 into the cracked wall, breaking it. Row 3 turns down at (1,3) onto the fixed mirror again, which turns it right the same way, through the gap to the goal. Alternative in 4 shots: rows 2, 2, 3, 1. The bonus target sits below the gap: rows 1, 1, 2, 3, 2, the fourth shot breaking the wall and the last turning down into the reflector, back up and round through the top row onto it. |
| 35 | True north | 3 | Fixed mirrors with the player's mirror (`\`) and a glass mirror. Row 2 turns down at the glass `\` at (1,2), which shatters, and leaves at the bottom. With the mirror placed at (4,1), row 2 runs through the gap into the fixed `/` at (4,2), which turns it up into the player's mirror, which turns it into the wall and flips. Row 2 again: the fixed mirror turns it up the same way, and the flipped player's mirror now turns it right to the goal. Alternative in 4 shots: rows 5, 5, the mirror at (4,1), rows 2, 2. The bonus target needs the mirror at (2,5): rows 4, 4, 2, 4, the third shot shattering the glass and the last turning up at the fixed mirror onto it. |
| 36 | Other side | 1 | Introduces portals. The goal sits beside the lower portal, walled off from the left; row 2 runs straight into the upper portal and comes out of the lower one, beside the goal. Alternative in 3 shots: row 4 three times: it turns up at (2,4) into the upper portal and comes out of the lower one moving up, flipping (5,3) beyond it; the second shot sets (2,4) back, and the third goes up through the portals again, where (5,3) now turns it right and the `\` at (6,3) down into the goal. The bonus target, beside the wall left of the lower portal, needs the portals both ways: rows 4, 1, 5. Row 4 goes up through the portals, back along row 3, down column 1 and out along the bottom row, flipping four mirrors; row 1 runs down column 1 and along row 3 and leaves at the top. Row 5 then climbs column 1, runs along row 3, turns down at (5,3) into the lower portal, comes out of the upper one moving down, and turns right at (2,4), flipped by row 4, onto the target. Its `\` at (1,5) was added for it, away from the par route. |
| 37 | Shortcut | 2 | Portals with a setup shot. Row 4 turns up at (1,4) into the wall and flips it; row 4 again turns down there and right at (1,5), along the bottom row into the portal at (4,5), and comes out of the one in the top left corner, running along the top row to the goal. Alternative in 3 shots: rows 5, 5, 4. The bonus target shows that portals work both ways: row 1 goes straight into the top left portal and out of the bottom one; three row 1 shots flip the mirrors beyond it until the last turns up at (5,5) and right at (5,4) onto it. |
| 38 | Knock first | 3 | Portals with a breakable wall. Row 3 turns down at (4,3) and left at (4,4) into the lower portal, comes out of the upper one moving left and leaves at the top, flipping (1,1). Row 5 climbs column 1 and turns right at (1,1) into the upper portal; it comes out of the lower one and turns down at (4,4), now `\`, into the cracked wall, breaking it. Row 1 then runs down column 1 and along the bottom row through the gap to the goal. Alternative in 5 shots: rows 1, 1, 1, 3, 1. The bonus target, at the end of row 3, needs the portals: rows 3, 3, 3, 5, the last coming out of the lower portal and turning up at (4,4) and right at (4,3) onto it. |
| 39 | Boomerang | 4 | Portals with a reflector. Row 3 flips the `\` at (1,3) and leaves at the bottom; row 3 again climbs column 1 and leaves at the top, flipping (1,2) and (2,2); row 2 turns down column 1 into the left portal and comes out of the right one, leaving the board. Row 3 then turns down at (2,2) into the left portal, comes out of the right one moving down into the reflector, goes back up through both portals and meets (2,2), which it flipped on the way in: it now turns the pellet right along row 2 to the goal. Alternative in 5 shots: rows 2, 2, 3, 2, 3. The bonus target sits between the portals and needs them: rows 4, 1, 4, 4, 4, all but the fourth going through the portals and up column 5; the last turns left at (5,1) and down at (4,1) onto it. |
| 40 | Looking glass | 4 | Portals with a glass mirror and a fixed mirror. Row 3 turns down at (1,3) onto the glass `\` at (1,4), which turns it right and shatters; it leaves up column 3, flipping (3,4). Row 4 runs through the gap the glass left, turns down at (3,4) and left at (3,5) into the fixed `/` at (2,5), which sends it out at the bottom. Row 4 again only flips (3,4) back, leaving (3,5) turned the new way. Row 4 then turns down at (3,4) and right at (3,5) along the bottom row into the right portal, comes out of the left one into the same fixed `/` from the other side, which turns it up column 2, and (2,2) turns it right into the goal. Alternative in 5 shots: rows 3, 3, 2, 3, 4. The bonus target needs the portals: rows 3, 3, 2, 4, 3, the last coming down column 2 into the fixed `/`, which turns it left into the left portal; out of the right one, moving left, it turns up at (3,5) and right at (3,4) onto it. |
| 41 | One way | 2 | Introduces one-way gates. Row 4 runs straight into the side of the `^` gate at (3,4) and stops; without the gate it would turn up at (4,4) and (4,3) into the goal in one shot. Row 1 turns down at (3,1) into the same gate head-on and stops too. Row 3 instead turns up at (4,3) and (4,2) and leaves, flipping both; row 2 then passes the `>` gate at (2,2) and turns down at (4,2) and right at (4,3) to the goal. Alternative in 4 shots: row 2 four times. The bonus target, in the top right corner, needs a gate passed: rows 1, 5, 5, the last climbing column 3 up through the `^` gate that stopped row 1 coming down, and right at (3,1) onto it. |
| 42 | No way back | 3 | Two `^` gates, one passed and one stopping from the side. Row 4 turns down at (2,4) and leaves at the bottom, flipping it; row 4 again climbs column 2 through the lower `^` gate, right at (2,2) and down at (4,2), then left at (4,4) into the side of the second `^` gate at (3,4), which stops it, having flipped all four mirrors on its way. Row 1 then turns down at (2,1), right at (2,2), up at (4,2) and right at (4,1) along the top row to the goal. Alternative in 5 shots: rows 1, 1, 1, 4, 4. The bonus target, at the end of row 3, needs a gate passed: four row 5 shots. The second climbs column 3 through the lower `^` gate and turns left at (3,3) into the side of the other gate, which stops it; the fourth climbs through the lower gate again, and (3,3), turned back, sends it right along row 3 onto the target. With the gates made walls, no number of shots reaches it. |
| 43 | Echo chamber | 3 | One-way gates with a reflector and a breakable wall, all three in the first shot. Row 1 turns down at (1,1) into the reflector, comes back up into the same mirror, now `/`, and runs right along the top row through the `>` gate; (5,1) turns it down and (5,3) left along row 3 into the cracked wall at the left edge, breaking it. Row 3 runs through the gap, turns down at (5,3) and left at (5,4) into the side of the `v` gate, which stops it. Row 3 again turns up at (5,3) and right at (5,1), both flipped, into the goal. Without the `v` gate, row 4 would be a second way to set up. Alternatives in 4 shots: rows 1, 1, 1, 3 and rows 3, 3, 3, 3. The bonus target, at the right end of the `v` gate's row, needs a gate passed: rows 1, 1, 3, 1, 3, every row 1 shot running through the `>` gate. |
| 44 | Double crossing | 4 | One-way gates with portals and a two-hit goal; the `>` gate stands on the row the left portal sends the pellet along. Row 4 turns down at (2,4) and right at (2,5), and (3,5) sends it out at the bottom, flipping all three. Row 5 turns up at (2,5) and right at (2,4) into the right portal, comes out of the left one, and runs along row 3 through the `>` gate into the goal, flipping the first two back. Row 4 again turns down and right the same way, but (3,5) now turns it up into the side of the `>` gate, which stops it, and so sets (3,5) back; row 5 then makes the same trip through the portals for the second hit. Alternative in 6 shots: rows 4, 5, 5, 5, 5, 5. The bonus target, below the top row, needs a gate passed: rows 1, 4, 4, 1, 4, 4. The `^` gate stops row 1 coming down column 2 head-on, and the last row 4 climbs up through it and turns right and down onto the target. |

*One way* (41) and *No way back* (42, added 2026-10-17 to start a new
chapter) came from `npm run generate -- --gates 2`: 41 with `--shots 2
--bonus-needs gate --seed 2` on a 5×5 board with 5 mirrors and no walls,
42 with `--shots 3 --varied-rows` on a 6×5 board with 6 mirrors and 1
wall (seed 3). Both have a unique shortest solution; random-play odds 1
in 25 and 1 in 125. Their bonus targets need a gate passed (the tests
check it, as for portals): 41's came with its board (its first board had
none, even with `npm run bonus -- --changes 2 --needs gate`, and was
replaced before release), 42's from `npm run bonus -- --changes 2
--needs gate` after two added mirrors, at (3,3) and (3,5). 42's first
target, beside the goal column, was out of reach without the gates only
within its 4 shots: a player found it in 6 shots of row 5 that never pass
a gate, so the check now allows no route at all, and the two mirrors
added for that target were taken out again. The only board changes `npm run
alternatives` finds for a par + 1 alternative on 41 replace its `^`
gate, so its alternative stays at par + 2.

*Echo chamber* (43, added 2026-10-18), the first of three levels with
two earlier pieces each to end the game, came from `npm run generate --
--gates 2 --reflectors 1 --breakable 1 --shots 3 --varied-rows
--bonus-needs gate --seed 3` on a 6×5 board with 5 mirrors and no walls,
which keeps only boards that need every piece named: about one board in
30,000 does, and the only other found (in 240,000 tries) had four
shortest solutions and both gates on the left edge. It has a unique
shortest solution, random-play odds 1 in 125 and foresight 3, as *No way
back* (42): its step up is in reading three kinds of piece.

*Double crossing* (44, added 2026-10-18) came from `npm run generate --
--gates 2 --portals --goal-hits 2 --shots 4 --varied-rows --bonus-needs
gate --seed 3` on a 6×5 board with 5 mirrors and no walls: about one
board in 2,000 needs all three, and 7 of 437 had a bonus target needing a
gate; three of those had a unique shortest solution. It was chosen for
its gates inside the board (the others had a gate or portal at the left
edge, where row 1 enters a portal at once). Random-play odds 1 in 625 and
foresight 3, a step above 43 by odds. No bonus target needs both the
gates and the portals, even with a board change.

*Looking glass* (40, added 2026-10-17 to end the portal chapter with a
glass mirror and a fixed mirror) came from `npm run generate --
--portals --glass 1 --fixed 1 --shots 4 --bonus-needs portal` on a 6×5
board with 5 mirrors and 1 wall, which keeps only boards that need the
portals, the glass shattered and the fixed mirror for par: about one
board in 2,000 does, and 2 of 30 had a bonus target needing the portals.
Random-play odds 1 in 625, as *Boomerang* (39); the only boards found
at 1 in 1,296 fired one row four times.

Levels 31–32 were found with `npm run generate -- --fixed N`, which
keeps only boards that can't reach par with their fixed mirrors made
ordinary ones (31 with `--fixed 1 --shots 2` on a 5×4 board with 3
mirrors and 1 wall, 32 with `--fixed 2 --shots 3 --no-repeat` on a 6×5
board); both have a unique shortest solution. Their bonus targets were
chosen among `npm run bonus` placements with `--uses fixed` (31 after
two added mirrors, at (3,2) and (3,4); 32 after two, at (5,1) and
(1,4)), and 32 got a mirror at (6,2) for an alternative one shot above
par (`npm run alternatives`). *Strike twice* (33, added 2026-10-17 to
give the chapter a two-hit goal before its last two levels) came from
`--fixed 2 --goal-hits 2 --shots 4 --varied-rows --bonus-needs fixed`
on a 6×5 board with 6 mirrors and 1 wall: random-play odds 1 in 625,
and a bonus target out of reach without the fixed mirrors.

Levels 34–35 combine fixed mirrors with earlier pieces, found with `npm
run generate -- --fixed N`: 34 with `--fixed 2 --breakable 1
--reflectors 1 --mirrors 5 --walls 1 --shots 3 --no-repeat`, 35 with
`--fixed 2 --glass 1 --mirrors 4 --walls 1 --player-mirror backslash
--place-later --shots 3`, on 6×5 boards; each keeps only boards that need
every piece named. Both have a unique shortest solution. Their bonus
targets were chosen among `npm run bonus` placements with `--uses fixed`
(34 after two added mirrors, at (2,2) and (3,2); 35 after one, at
(2,4)), which also keep every piece the level needs.

Levels 26–27 were found with `npm run generate -- --glass N`, which keeps
only boards that can't reach par with their glass mirrors made ordinary
mirrors (26 with `--glass 1 --shots 2` on a 5×4 board, 27 with `--glass 2
--shots 3 --no-repeat` on a 6×5 board); both have a unique shortest
solution. Their bonus targets (each after one added mirror, at (2,3) and
(2,4)) take par + 2 shots, as the ones in par + 1 all changed the par
route, and their routes pass through the shattered glass.
*Glass and stone* (30, added 2026-10-17 to end the chapter with
breakable walls) came from `--glass 2 --breakable 2 --shots 4
--varied-rows --bonus-needs glass` on a 6×6 board with 6 mirrors and no
walls: random-play odds 1 in 1,296, the chapter's hardest, above
*Double glazing* (625), and a bonus target out of reach without
shattering the glass.

Levels 23–24 and 28–29 combine the new pieces with earlier ones, found
with `npm run generate` and both options: 23 with `--reflectors 1
--breakable 2`, 24 with `--reflectors 1 --player-mirror backslash
--place-later`, 28 with `--reflectors 1 --glass 2` (all three `--shots 3`)
and 29 with `--glass 2 --goal-hits 2 --shots 4`, on 6×5 boards; each
keeps only boards that need every piece named. All four have a unique
shortest solution. Their bonus targets were chosen among `npm run bonus`
placements (23, 28 and 29 after one change: a cracked wall at (4,2), a
mirror at (3,4), a mirror at (1,5)) for routes through the new pieces.

Levels 21–22 were found with `npm run generate -- --reflectors N`,
which keeps only boards that can't reach par with their reflectors made
walls (21 with `--reflectors 1 --shots 1 --require-setup` on a 5×4
board, 22 with `--reflectors 2 --shots 2 --no-repeat` on a 6×5 board);
both have a unique shortest solution. Their bonus targets were chosen
among `npm run bonus` placements (22's after one added mirror, at (1,3))
for routes that use the reflectors too. *Double back* (25, added
2026-10-17 to end the chapter with a two-hit goal) came from
`--reflectors 1 --goal-hits 2 --shots 4 --varied-rows --bonus-needs
reflector` on a 6×6 board with 7 mirrors and 1 wall: random-play odds
1 in 1,296, between *Ricochet* (125) and *Mirror image* (3,143), and a
bonus target out of reach without the reflector.

Levels 16–18 were found with `npm run generate -- --player-mirror slash`
(17 and 18 with `--place-later`), which keeps only boards that can't
reach par without the mirror; the tests check that too. *Hairpin* (17,
added 2026-10-17 so that only the chapter's last two levels add
breakable walls and the two-hit goal) came from `--shots 2` on a 6×5
board with 7 mirrors and 1 wall: random-play odds 1 in 733, between
*Your move* (112) and *Double duty* (3,333). Its bonus target took
`npm run bonus -- --changes 2`: the `/` at (3,1) made way for it and the
`\` at (3,2) became a wall. Levels 19–20 were found with
`--player-mirror slash --breakable 2 --goal-hits 2`, which also needs a
cracked wall broken (19 with `--shots 3` on a 5×5 board with 5 mirrors
and 1 wall, added after v1.0 to ease the step to 20). All five have a
unique shortest solution.

Levels 11–15 were found with `npm run generate -- --breakable N`, which
keeps only boards that can't reach par with their breakable walls made
solid; the tests check that too. Levels 11–15 can't be solved at all that
way; levels 19 and 20 can, in 8 and 6 shots, using the player mirror.
*Trapdoor* (12, added 2026-10-17 so that only the chapter's last two
levels add the two-hit goal) came from `--breakable 2 --shots 4
--varied-rows` on a 7×5 board with 7 mirrors: a small board with par 4
puts its random-play odds (1 in 625) between *Breakthrough* (216) and
*Stone by stone* (2,401). Its bonus target is the only `npm run bonus`
placement without board changes.

Levels 5–10 were found by searching random boards with the solver, keeping
ones with exactly one shortest solution, and choosing by readability and
variety of solutions. *Down and around* (5) is about as hard as *Set the
stage* (4), so it closes *Basics*. Levels 6–7 are deliberately small, to
teach the multi-hit goal at the start of *Flip tricks*, and come before
the harder single-hit levels 8–10, so the difficulty doesn't dip at the
end. Each of the two chapters has five levels (regrouped on 2026-10-17,
from four and six).

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
  in `src/levels/levels.ts`, following the music groups): 1–5 *Basics*,
  6–10 *Flip tricks*, 11–15 *Breakable walls*, 16–20 *Your mirror*,
  21–25 *Reflectors*, 26–30 *Glass mirrors*, 31–35 *Fixed mirrors*,
  36–40 *Portals*, 41–44 *One-way gates*. Each
  chapter is a row of square level tiles (at most six) with a label: its
  number, name in capitals, and stars earned in it (`★ 3/4`, or
  `locked`). The label sits left of the tiles on a wide screen and on one
  line above them on a narrow one (a phone), so the screen keeps its full
  size on a desktop. Chosen on the level list lab page (2026-10-11), when
  one row per level had shrunk the screen's text with every level added.
- The chapters **scroll** when the screen is too short for them, so new
  chapters never shrink the screen: it shrinks only to fit its width and
  at least about two chapters' worth of list, between the header and the
  selected level's line, which stay put. The list scrolls with the mouse
  wheel, by dragging (a drag never opens the level it started on; a
  quick one glides on), and follows the arrow keys, gliding to show the
  selected tile's whole chapter. It opens on the chapter of the level
  *Play* starts. A thin scroll bar right of the tiles shows, while the
  list doesn't all fit, how much of it is in view and where: its thumb
  can be dragged (it lights up in the beam colour under the pointer) and
  a click on its track pages up or down. Tiles also fade towards an edge
  with more of the list beyond it. Gliding is left out under reduced
  motion.
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
| Gate | `#ffb547`, rails `#4a5d82` | One-way gates' arrow and rails |
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
- **Glass mirrors**: a mirror's glass bar broken into three panes with
  small gaps, slightly fainter, so they read as fragile. They burst into
  thin glass shards when hit.
- **Fixed mirrors**: a matte steel bar with a dull centre line and a
  dark bolt at each end, without the glass mirrors' glow, so they read as
  pieces that don't turn.
- **Reflectors**: a round glass ring on a dark disc, with the three
  facet lines of a corner cube (a Y) and a bright centre dot, glowing
  pale blue like the mirrors. The beam turns back at the ring.
- **Portals**: a violet ring around a dark well, with three curved vanes
  swirling into a bright centre dot; the vanes turn slowly (they stay
  still with reduced motion). Violet is used for no other piece, so a level's two
  portals read as a pair.
- **One-way gates**: an amber arrow pointing the way the pellet may
  pass, between two dark rails along its sides, without glow of its own
  beyond the arrow. Amber is used for no other piece.
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
| Portal | *Phase drop* (sound lab 7): a quick tone dropping an octave into the bounce's ladder note, panned to the portal the pellet goes into, landing 60 ms later as a soft bell panned to the one it comes out of |
| Fixed mirror bounce | *Anvil ring* (sound lab 6): a round note on the bounce's ladder note with a bright metallic overtone above it, like a small steel bar; no swish, as nothing turns. A little quieter than on the lab page |
| Reflector hit | *Echo ping* (sound lab 5): the bounce's bell on the same ladder note, answered by two quick, quieter repeats that move back towards the centre, as the beam goes back; no swish, as nothing turns |
| Glass mirror shatters | *Crack and tinkle* (sound lab 5): the bounce's ping on its ladder note, cut off by a short bright crack and three small clicks, then six tiny high notes falling down the music's scale, like the shards |
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
| Levels 1–5 (basics) | **Afterglow**: warm pads whose filter slowly opens and closes, a soft sine bass, an occasional echoing pluck. Am9 – Fmaj7 – Cmaj7 – G6, a chord every 8 s |
| Levels 6–10 (multi-hit goals, harder flips) | **Glass garden**: a slow, dark drone with a soft bell now and then; the calmest track, for the hardest levels before breakable walls |
| Levels 11–15 (breakable walls) | **Prism drift**: two swaying chords (Fmaj7♯11 – Cmaj9), a faint high shimmer, glassy bells now and then with a long tail |
| Levels 16–20 (player mirror) | **Photon**: dark pads and sub bass on Em9 – Cmaj9, crossed now and then by a soft gliding tone with a long echo, like a slow laser streak |
| Levels 21–25 (reflectors) | **Return**: pads and bass on Dm9 – B♭maj7♯11. Now and then a two-note pluck phrase on the left is answered from the right by its mirror image (the step turned upside down), quieter and further away, like a shot coming back from a reflector, changed |
| Levels 26–30 (glass mirrors) | **Glass harp**: softer pads and bass on F♯m(add9) – Dmaj7, with slow glass-harmonica tones (a wavering, bowed-glass sound) rising out of them now and then, sometimes two at once |
| Levels 31–35 (fixed mirrors) | **Anchor**: pads on Gm9 – E♭maj7 over a bass that stays on G under both chords. Now and then a soft steel tine rings, always the same note (D) from the same place, slightly right: the one thing that doesn't change |
| Levels 36–40 (portals) | **Wormhole**: pads on C♯m9 – Amaj7. Now and then a soft bell note rings on one side, a faint breath of air follows, and the same note rings again from the other side, unchanged, like a pellet going through a portal |
| Levels 41–44 (one-way gates) | **Photon** for now, until the chapter has its own track |

Level music is background to think to: no drums and no tune to follow,
chords that change only every 8–9 seconds, and small details (plucks,
bells, glides) placed at random so the loop is hard to notice. The title
screen can be livelier. A track change marks a new mechanic, so new levels
take the track of their mechanic's group. (Livelier drafts with beats and
tunes were tried on sound lab 2 and found too distracting.)

Return and Glass harp were chosen on sound lab 4 (2026-10-11), and play a
little quieter and rarer than on the lab page; Anchor on sound lab 6
(2026-10-11), its tine a little quieter and rarer too; Wormhole on sound
lab 7 (2026-10-16), its bells likewise. Most music sits in the
centre; off centre are Return's answering phrase (35 % to either side),
Anchor's tine (20 % right) and Wormhole's two bells (50 % to either
side, one each).

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

- More block types (e.g. switches and doors; listed in
  `docs/ROADMAP.md`), and several portal pairs per level.
- More player-placed blocks: several mirrors, or other kinds of blocks
  (see *Player-placed mirror*).
- Shot limits or par scores per level.
- Level select and progress saving.

## Open questions

- None at the moment. (Resolved: the board changes between shots because
  mirrors flip when hit.)
