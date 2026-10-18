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

## Version 4.0 — complete (2026-10-18)

The fourth major version completes the game. A ninth piece, one-way
gates, gets its chapter (levels 41–45, *Current*, *Shut* and *Air
through*), ending the main levels with *Last light* (45). After them
comes a secret chapter, *Prism* (46–50): hidden from the level list
until every bonus target is found, five par-5 levels that bring every
piece back in new combinations, each playing an earlier chapter's
music, the last *Afterglow*, level 1's. Its levels earn a rainbow star
at par, the last of them plays its own ending, *Prism ripple*, and the
title then turns to the bonus colours. Reaching par on every level now
hints that there is more to find. 50 levels in ten chapters. Saves from
earlier versions keep working: no released level's id, board or par
changed. For testing, `?setup=` in the address loads a save one step
short of each once-per-player moment, on a desktop or a phone, and the
browser tests also run in WebKit.

## Version 3.0 — complete (2026-10-17)

The third major version overhauls the level list: two more pieces, each
with its own chapter, music and sound, fixed mirrors (levels 31–35,
*Anchor*, *Anvil ring*) and portals (levels 36–40, *Wormhole*, *Phase
drop*), and every chapter regrouped or extended to five levels, so each
teaches its piece first and combines it with earlier ones in its last
levels. Six new levels fill the chapters: *Trapdoor* (12), *Hairpin*
(17), *Double back* (25), *Glass and stone* (30), *Strike twice* (33)
and *Looking glass* (40), and *Down and around* moved from 7 to 5. 40
levels in eight chapters. Saves from earlier versions keep working:
progress is saved by level id, and no id, board or par changed, though
many levels have new numbers. The level list now scrolls, with a scroll
bar, and a restart after first reaching par brings in the bonus target.

## Version 2.0 — complete (2026-10-11)

The second major version adds two new pieces, each with a chapter of four
levels: reflectors (levels 19–22, the last two with breakable walls and
the player's mirror) and glass mirrors (levels 23–26, the last two with a
reflector and a two-hit goal), with their own music tracks (*Return*,
*Glass harp*) and sounds (*Echo ping*, *Crack and tinkle*). 26 levels in
six chapters. Saves from version 1 keep working: level ids are unchanged,
and the new levels are added within the chapters' order.

## Version 1.0 — complete (2026-10-11)

The first major version is complete and released as v1.0: 17 levels with
flipping mirrors, multi-hit goals, breakable walls, the player-placed mirror
and bonus targets, the Laser lab graphics and sound passes, saved progress
and par stars. Open items below belong to later versions.

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

Suggested order from here (2026-10-11): playtesters' feedback would
settle the items that wait on how people play: the step to *Rebuild*
and the difficulty measure. The game's finale, the main open level
design question after the review of all 40 levels (2026-10-17,
*Difficulty curve*), is answered by *Last light* (45) and the secret
chapter (46–50); a better difficulty measure (Engineering track,
*Later*) would still help judge the curve.

### Next

- [x] More levels built around flipping mirrors, with rising difficulty
  (levels 5–8: 2, 3, 3 and 4 shots)
- [x] Par scores: show each level's minimum shot count and reward matching it
  with a star
- [x] Scale the game to fit the window, so larger levels work on small
  screens and phones (touch input already works through pointer events)

- [x] Hints (2026-10-18): a hand-written text hint on every level, and
  after 2 minutes on the level a second hint that frames the emitter of
  a par solution's first shot (`docs/DESIGN.md`, *Hints*)
  - [ ] Playtest the 50 text hints: does each help without giving the
    level away? Reword the ones that say too much or too little
  - [ ] Check the hint frame on a phone

### Mechanic ideas

Each needs a design in `docs/DESIGN.md`, and a decision on how it interacts
with flipping mirrors, before it is built.

- [ ] Player-placed blocks
  - [x] One player-placed mirror of a fixed direction, on any empty cell,
    placed between shots without taking one; levels 16–18 use it.
    Design in `docs/DESIGN.md`, *Player-placed mirror*
    - [x] A fifth level in the *Your mirror* chapter, *Hairpin* (17,
      par 2, 2026-10-17), so that only the last two add breakable walls
      and the two-hit goal: a setup shot flips the mirrors around the
      player's mirror, placed in the middle of the board, and the final
      shot makes a hairpin turn around it. Odds 1 in 733, between 16
      (112) and 18 (3,333)
  - [ ] More mirrors per level, or other placeable blocks
- [ ] New block types
  - [x] Breakable walls (`%`): stop the pellet once and break; levels
    11–15 use them (14–15 with two-hit goals)
    - [x] A fifth breakable wall level in the middle of the chapter,
      *Trapdoor* (12, par 4, 2026-10-17), so that only the last two
      combine breakable walls with the two-hit goal: one row breaks a
      wall to open a column, another breaks a second wall along the
      bottom, and a third shot repairs the mirrors it flipped. Odds
      1 in 625, between 11 (216) and 13 (2,401)
  - [x] Fixed mirror (`L` `\`, `J` `/`): turns the pellet like a mirror
    but never flips (drawn in matte steel, bolted down). Gives levels
    fixed points to plan around. Levels 31–35 teach it (chapter *Fixed
    mirrors*). Design in `docs/DESIGN.md`, *Fixed mirrors*
    - [x] Its own music track: *Anchor*, chosen on sound lab 6
    - [x] Its own hit sound: *Anvil ring*, chosen on sound lab 6
    - [x] Harder fixed mirror levels: 34 with breakable walls and a
      reflector, 35 with the player's mirror and a glass mirror
    - [x] A fifth fixed mirror level, *Strike twice* (33, par 4,
      2026-10-17), the chapter's two-hit goal, in the middle so that
      the last two keep their combinations of pieces: two setup shots
      off the fixed mirrors flip the mirrors row 1 needs to reach the
      goal, and one of them meets the same fixed mirror twice. Its
      bonus target needs the fixed mirrors. Odds 1 in 625
  - [x] Glass mirror (`N` `\`, `Z` `/`): turns the pellet once, then
    shatters and leaves an empty cell, the mirror version of the
    breakable wall. Levels 26–30 teach it (chapter *Glass mirrors*).
    Design in `docs/DESIGN.md`, *Glass mirrors*
    - [x] Harder glass mirror levels: 28 with a reflector, 29 with a
      two-hit goal
    - [x] A fifth glass mirror level, *Glass and stone* (30, par 4,
      2026-10-17), ending the chapter with breakable walls: one row
      breaks a wall to open column 1, the next shatters a glass mirror
      and breaks the second wall, a third shatters the other glass while
      resetting the mirrors, and the last runs through the gaps to the
      goal. Its bonus target needs the glass. Odds 1 in 1,296, the
      chapter's hardest
    - [x] Its own music track: *Glass harp*, chosen on sound lab 4
    - [x] A shattering sound: *Crack and tinkle*, chosen on sound lab 5
  - [x] Reflector (`@`): sends the pellet straight back the way it came.
    The return trip meets the mirrors it already flipped, so it goes
    somewhere new. Levels 21–25 teach it (chapter *Reflectors*). Design
    in `docs/DESIGN.md`, *Reflectors*
    - [x] Harder reflector levels: 23 with breakable walls, 24 with the
      player's mirror
    - [x] A fifth reflector level, *Double back* (25, par 4,
      2026-10-17), ending the chapter with a two-hit goal: every row 2
      shot doubles back off the reflector through the mirror it has just
      flipped, the first exits and sets up the next, which reaches the
      goal, and row 3 resets the mirrors for a second hit. Its bonus
      target needs the reflector. Odds 1 in 1,296, between 23 and 24
    - [x] Its own music track: *Return*, chosen on sound lab 4
    - [x] Its own hit sound: *Echo ping*, chosen on sound lab 5
  - [x] Portal pair (`O`): the pellet enters one and leaves the other in
    the same direction. No state of its own, so no cost to the solver;
    reaches rows and routes the left edge can't. One pair per level.
    Levels 36–40 teach it (chapter *Portals*). Design in
    `docs/DESIGN.md`, *Portals*
    - [x] Its own music track: *Wormhole*, chosen on sound lab 7
    - [x] Its own sound as the pellet goes through: *Phase drop*, chosen
      on sound lab 7
    - [x] Harder portal levels: 38 with a breakable wall, 39 with a
      reflector
    - [x] A fifth portal level, *Looking glass* (40, par 4, 2026-10-17),
      ending the chapter and the game with a glass mirror and a fixed
      mirror: the first shot shatters the glass, two more set up the
      mirrors through its gap, and the last goes through the portals
      into the fixed mirror from its other side. Its bonus target needs
      the portals. Odds 1 in 625, as 39
    - [ ] Optional: several pairs per level, each with its own symbol and
      colour
  - [x] One-way gate (`>` `<` `^` `v`): the pellet passes in the
    arrow's direction and is stopped like a wall from the others. No state
    of its own, so no cost to the solver. Levels are built around both
    sides: one gate passed, one blocking another way. Design in
    `docs/DESIGN.md`, *One-way gates*
    - [x] Two teaching levels in a new chapter *One-way gates*: *One way*
      (41, par 2, 2026-10-17), where a gate stops the obvious one-shot
      route from the side and a setup shot opens the way through the
      other gate, and *No way back* (42, par 3), where a gate stops the
      pellet from the side after it climbed through the other. Odds 1 in
      25 and 1 in 125. Their bonus targets need a gate passed, by any route
      (41 got a new board for it and 42 a new target before release)
    - [x] Three more gate levels to end the chapter and the main levels,
      each with two earlier pieces besides the gates (chosen 2026-10-18
      for the combinations the review found missing, and to end on the
      hardest level; complete 2026-10-18). They ended the game until the
      secret chapter, *Prism* (46–50), came after them
      - [x] *Echo chamber* (43, par 3): a reflector and a breakable wall.
        Row 1 bounces off the reflector, passes a gate and breaks the wall
        in one shot; a gate stops row 3 from the side. Odds 1 in 125,
        foresight 3, as 42
      - [x] *Double crossing* (44, par 4): portals and a two-hit goal
        (portals had never had one). Row 5 goes through the portals and a
        gate on the exit's row into the goal; a setup shot stopped by the
        same gate's side resets a mirror for the second hit. Odds 1 in
        625, foresight 3
      - [x] *Last light* (45, par 5), the main levels' finale: the
        player's mirror and a glass mirror (the player's mirror had never
        met glass). One gate works three ways: passed by row 1, stopped
        head-on by row 3 and from the side by row 4 off the player's
        mirror. Odds 1 in 71,918, the game's highest; foresight 4. A board with foresight 6 was set
        aside, as no bonus target on it could need a gate
    - [x] Its own music track: *Current*, chosen on sound lab 8
    - [x] Its own sounds: *Shut* when a gate stops the pellet and *Air
      through* when it passes one, chosen on sound lab 8
  - [ ] Switch and doors: hitting a switch stops the pellet and toggles
    every door on the board between open and closed. Needs cell
    behaviours that can change other cells, not only their own
- [x] Optional bonus targets: one extra target per level, not needed to
  finish and not counted in par, shown once the level has been completed
  at par; collecting it turns the level's star golden. Design in
  `docs/DESIGN.md`, *Bonus targets*
- [x] Multi-hit goal: a goal that must be hit several times to complete the
  level, showing the hits remaining. Decided: each hit is a separate shot,
  mirror flips stay between hits, and par counts all shots. *Double
  take* and *Warm-up* (levels 6–7) teach it

### Difficulty curve

Measured on 2026-10-10 (v0.34) by `npm run levels`, level 19 added and level 20 given alternatives on
2026-10-11, *Down and around* moved from 7 to 5, *Trapdoor* added as
level 12, *Hairpin* as level 17, *Double back* as level 25, *Glass
and stone* as level 30, *Strike twice* as level 33 and *Looking glass*
as level 40 on 2026-10-17, which
ends with this curve: the chance that random play completes a level within par (a random
row each shot; in player-mirror levels a random cell for the mirror, or
keeping it). Lower is harder. It dips at each new mechanic (6, 11,
14, 16, 19), as intended:

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 in | 5 | 6 | 25 | 36 | 36 | 16 | 64 | 343 | 343 | 2,048 |

| Level | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 in | 216 | 625 | 2,401 | 125 | 7,776 | 112 | 733 | 3,333 | 2,553 | 45,000 |

*Trapdoor* (12) sits between *Breakthrough* (11) and *Stone by stone*
(13), and *Hairpin* (17) between *Your move* (16) and *Double duty*
(18), so both chapters climb through their simpler levels before the
last two combine the chapter's piece with breakable walls and the
two-hit goal.

Levels 21–35 (reflectors, then glass mirrors, then fixed mirrors; added
2026-10-11, v1.26–v1.28 and v2.3–v2.5; *Double back* (25) on
2026-10-17, which ends the reflector chapter with a two-hit goal,
*Glass and stone* (30), which ends the glass chapter with breakable
walls, and *Strike twice* (33), the fixed mirror chapter's two-hit
goal):

| Level | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 in | 4 | 25 | 125 | 3,143 | 1,296 | 16 | 125 | 125 | 625 | 1,296 |

| Level | 31 | 32 | 33 | 34 | 35 |
|---|---|---|---|---|---|
| 1 in | 16 | 125 | 625 | 125 | 3,387 |

Levels 36–40 (portals, added 2026-10-16): two easy teaching levels at
the start of the chapter like 21, 26 and 31, then 38 with a breakable
wall and 39 with a reflector, which sends the pellet back through the
portals. 39 is par 4 so that it is harder than 38 (with five rows, par 3
can't be harder than 1 in 125), well below *Mirror image* (24).
*Looking glass* (40, added 2026-10-17) ends the chapter with a glass
mirror and a fixed mirror, as hard as 39 by both measures: like *Steel
echo* (34) it has three kinds of special piece, so its difficulty is in
reading the board more than in the odds:

| Level | 36 | 37 | 38 | 39 | 40 |
|---|---|---|---|---|---|
| 1 in | 5 | 25 | 125 | 625 | 625 |
| Foresight | 0 | 1 | 4 | 3 | 3 |

Levels 41–44 (one-way gates, added 2026-10-17 and 18): two teaching
levels with only gates, the first easy like 36, the second a step up;
then *Echo chamber* (43) with a reflector and a breakable wall, as hard
as 42 by both measures, its step being three kinds of piece to read, and
*Double crossing* (44) with portals and a two-hit goal, five times
harder by odds, and *Last light* (45), the finale, at par 5 with the
player's mirror, the hardest level of the game by odds:

| Level | 41 | 42 | 43 | 44 | 45 |
|---|---|---|---|---|---|
| 1 in | 25 | 125 | 125 | 625 | 71,918 |
| Foresight | 2 | 3 | 3 | 3 | 4 |

Levels 46–50, the secret chapter. *Long game* (46, added 2026-10-18):
portals with a glass mirror, below *Last light* by odds (it has no
player's mirror to inflate them) but with the game's highest foresight:

| Level | 46 | 47 | 48 | 49 | 50 |
|---|---|---|---|---|---|
| 1 in | 3,125 | 3,125 | 3,125 | 64,286 | 3,125 |
| Foresight | 7 | 5 | 8 | 6 | 7 |

*Headwind* (47, added 2026-10-18) combines a fixed mirror, one-way gates
and a two-hit goal, none of 46's pieces. *Aftershock* (48, added the
same day) has two breakable walls and a reflector; its foresight of 8
is the game's highest. All three sit at the most odds a par-5 level on
five rows can have, so foresight is what tells them apart. *Far corner*
(49) adds the player's mirror to the chapter, with portals; its odds are
inflated by random play's mirror placement, as for other player-mirror
levels. *Full circle* (50) ends the chapter and the game with four
pieces: glass and fixed mirrors, portals and a two-hit goal.

Random odds understate how easy level 16 feels (the mirror's cell is easy
to see) and overstate levels that repeat a row (8, 11).

Foresight (added 2026-10-11, also in `npm run levels`): how many cells
the par solution changes, flipping a mirror, breaking a wall or placing
the player's mirror, that a later shot then passes through. It measures
how much a solution must plan ahead, which random odds miss. It counts
the solver's par solution only, and not the second goal hit:

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Foresight | 0 | 0 | 1 | 2 | 2 | 1 | 2 | 2 | 3 | 5 |

| Level | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|
| Foresight | 3 | 4 | 3 | 2 | 5 | 1 | 3 | 3 | 4 | 2 |

| Level | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 |
|---|---|---|---|---|---|---|---|---|---|---|
| Foresight | 0 | 2 | 4 | 5 | 3 | 1 | 3 | 3 | 3 | 5 |

| Level | 31 | 32 | 33 | 34 | 35 |
|---|---|---|---|---|---|
| Foresight | 1 | 3 | 3 | 3 | 2 |

Each new chapter starts easy again (21, 26 and 31 are among the easiest levels
in the game) and climbs. The steepest step is to *Mirror image* (24),
reflectors with the player's mirror: about 25 times harder than 23 by
odds, with the highest foresight of 21–29, about as hard as *Double duty*
(18). *Double back* (25) comes after it, but at about 10 times *Ricochet*
(23) and less than half of *Mirror image* by odds: the chapter ends on a
new combination rather than a harder level. *Glass and stone* (30) ends
the glass chapter as its hardest level, twice *Double glazing* (29) by
odds and with a foresight of 5, as high as any level: each of its four
shots uses a different piece. *Strike twice* (33) adds the two-hit goal
to fixed mirrors in the middle of their chapter; *Steel echo* (34) after
it dips back to 1 in 125 as it brings in breakable walls and a
reflector, like the dip at each new combination earlier.

The two agree that 10 and 15 are the hardest of 1–15. They disagree on
*Rebuild* (20): the hardest by odds, but a foresight of only 2, so its
difficulty is in finding the moves, not in planning their effects.

Review of all 40 levels (2026-10-17, after every chapter got five):

- **Chapters teach their piece well.** Each chapter from 3 on has two or
  three levels with only its new piece, then levels combining it with
  earlier ones, and every new piece gets its own opening message.
  Breakable walls come back in every later chapter, the two-hit goal in
  every one but *Portals*, reflectors in all three after their own;
  glass and fixed mirrors once or twice, as the game's end allows.
- **Thinnest combinations:** the player's mirror comes back only in 24
  and 35, never with glass or portals; portals never get a two-hit
  goal.
- **Within chapters the curve is a healthy sawtooth:** each starts easy
  (1 in 4 to 36) and climbs. Deliberate dips where a new combination
  starts mid-chapter (33 → 34) are fine.
- **Across chapters the peaks fall:** the hardest level of chapters 2–8
  by odds is 1 in 2,048, 7,776, 45,000, 3,143, 1,296, 3,387 and 625, so
  the last level is easier by odds than level 10. Foresight agrees: its
  5s are at 10, 15, 24 and 30, and *Portals* peaks at 4. Later levels
  are all par 3–4 on boards of about 6×5, and with a unique solution
  odds can't pass rows^par; the new pieces add reading difficulty
  neither measure sees, so the real decline is gentler, but the game
  doesn't build to a climax. (2026-10-18: the gate chapter ends the game
  with *Last light* (45) at par 5 and 1 in 71,918, above every level by
  odds, though random play overstates its player's mirror; its foresight
  of 4 is below the 5s.)
- **Steepest steps:** 14 → 15 (*Rubble run*, about 62 times by odds, par
  5 with foresight 5), 19 → 20 (*Rebuild*, 18 times) and 23 → 24
  (*Mirror image*, 25 times).
- **Odds overstate player-mirror levels:** random play puts the mirror
  on a random cell, so *Your move* (par 1) looks as hard as 1 in 112,
  and part of *Rebuild*'s 45,000 is the same effect; foresight is the
  better guide there.
- **Naming:** *Flip tricks* opens with the two-hit goal (6–7), while
  flipping is taught in *Basics* (3); the name fits 8–10 better.

- [x] A finale for the game: harden the last level of the later
  chapters (par 5, or 6–7 rows, so the odds can rise), or add a short
  final chapter of mixed levels using several pieces on larger boards,
  which would also bring every piece back once more. Answered
  (2026-10-18) by *Last light* (45, par 5) ending the main levels and
  the secret chapter, *Prism* (46–50, below): five par-5 levels of mixed
  pieces, every piece back once more, with foresight 5–8 (the highest
  before was 5). Its boards stayed 6×5, so its odds stop at 1 in 3,125
  (rows^par); foresight is what sets them apart
- [x] A secret chapter, *Prism*, shown only once every bonus target is
  found: harder levels with no new pieces, combining several earlier
  ones (complete 2026-10-18, v3.13–v3.20). Design in `docs/DESIGN.md`,
  *Secret chapter*. Its levels stay in the order they were added
  (foresight 7, 5, 8, 6, 7) rather than climbing, by choice: each
  combines different pieces, and *Full circle* (50) ends it with four
  - [x] The chapter itself (2026-10-18): hidden from the level list until
    the last bonus target, which opens it (its ending's second line says
    A HIDDEN CHAPTER HAS OPENED), stars counted over the open levels,
    no bonus targets of its own. Up and down on the title screen now go
    to the nearest row, so they reach a short chapter's tiles
  - [x] A first level to try it out: *Long game* (46, par 5), portals
    with a glass mirror, foresight 7 (the highest before was 5)
  - [x] A rainbow ★ in the level list for its levels at par, which have
    no bonus targets to turn golden, and its own ending when they are all
    at par (2026-10-18): *Prism ripple*, rainbow rings, a burst and rain
    of rainbow stars, a spectrum banner and a sound of six bells sweeping
    across in stereo. Not from a lab page: tune by eye and ear
  - [x] A second level with other pieces than 46's: *Headwind* (47, par
    5), a fixed mirror with one-way gates and a two-hit goal, the first
    level to combine fixed mirrors and gates
  - [x] A third level, with breakable walls and a reflector:
    *Aftershock* (48, par 5), foresight 8, the game's highest
  - [x] A fourth level with the player's mirror, which the chapter
    lacked, and portals, never combined with it before: *Far corner*
    (49, par 5), foresight 6
  - [x] A fifth and last level, *Full circle* (50, par 5): four pieces,
    a glass mirror, a fixed mirror, portals and a two-hit goal (together
    before only in *Double crossing*, 44); foresight 7. Five
    levels fill the chapter's row
  - [x] The title screen once the whole game is done (every bonus
    target found and the secret chapter at par): the title's letters in
    the bonus colours, lit one by one as the title beam passes under
    them when the screen opens
  - [x] Music: no track of its own; each level plays a different earlier
    chapter's track (46 *Wormhole*, 47 *Anchor*, 48 *Return*, 49
    *Photon*), and 50 plays *Afterglow*, level 1's, so the game ends on
    the music it began with
- [ ] Check by playing (or watching testers) whether the step to
  *Rubble run* (15), about 62 times *Crack and double* (14) by odds, is
  too steep, together with the steps to *Rebuild* and *Mirror image*
  below
- [x] Fill the thinnest combinations: the player's mirror met glass in
  *Last light* (45) and portals in *Far corner* (49), and portals met a
  two-hit goal in *Double crossing* (44) and again in *Full circle* (50)
- [ ] Optional: rename *Flip tricks* (6–10) after what it starts with,
  the two-hit goal. Chapter names are only shown, not saved, so this
  is cosmetic

- [ ] Check by playing (or watching testers) whether the step to *Mirror
  image* (24) is too steep. If it is, `npm run generate -- --reflectors 1
  --player-mirror backslash --place-later --shots 3` can find an easier
  board (or a bridge level before it, as *Clear the way* is for 20)
- [x] Smooth the step to *Rebuild* (then level 17, now 20), about 14
  times harder than *Double duty* and 6 times harder than *Rubble run*:
  a bridge level, *Clear the way* (par 3), now level 19, combines the same three
  mechanics (breakable walls, player mirror, two-hit goal) in an easy
  first form. Found with `npm run generate -- --player-mirror slash
  --breakable 2 --goal-hits 2 --shots 3 --width 5 --height 5 --mirrors 5
  --walls 1`; its bonus target with `npm run bonus -- --changes 1`
  - [ ] By random-play odds the bridge level is about as hard as 18, so
    the step from it to *Rebuild* (20) is now about 18 times. The
    bridge teaches the combination rather than the difficulty; whether
    20 still feels too steep is best judged by playing it (or seeing
    testers play it)
- [x] Five levels in each of the first two chapters (2026-10-17): *Down
  and around*, as hard as *Set the stage* and a dip after the two-hit
  goal levels, moved from level 7 to 5 and closes *Basics* (now 1–5,
  with *Afterglow*); *Flip tricks* is 6–10 and opens with the two-hit
  goal. Ids are unchanged, so saves keep working. This also removes the
  former level 7's dip
- [x] Alternative solutions one shot above par, so a player who strays
  from the par route can still finish: `npm run alternatives` lists them
  and finds board changes that add them. Levels 3, 9, 13 and 18 (now 14
  and 20) got one
  added mirror each with a route different from par; levels 6 and 8 (now
  7 and 8) one
  that lets a player recover after the par route's first shots (8's
  replaces the wall at (1,7)). Par, par solutions and bonus targets are
  unchanged; *Rebuild*'s random-play odds went from 1 in 47,500 to 45,000.
  Levels 4 and 7 (now 4 and 5) got two added mirrors each, for a route that starts
  differently from par. Level 11 still has no alternative one shot above
  par: board changes only add variants of its par route
  - [x] Keep it so for new levels: `npm run generate` shows only boards
    with an alternative within par + 2 (`--alternatives N`), `npm run
    levels` prints each level's, and the tests require one for every
    level

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
- [x] Level list layout: the title screen's text was small on a desktop
  screen (1280×800), because the whole screen, with one row per level, is
  shrunk to fit the height, and it got smaller with every level added.
  Chosen on the level list lab page (2026-10-11): **chapters by mechanic,
  each a row of numbered tiles** (number and state icon), the chapter's
  name and stars on its left (above the tiles on narrow screens), and
  the selected level's name and score in a line under the chapters.
  Chapters: 1–4 *Basics*, 5–10 *Flip tricks*, 11–14 *Breakable walls*,
  15–18 *Your mirror*; a new mechanic adds a chapter. Levels still
  unlock one by one, as now
  - [x] Room for more chapters: with seven chapter rows (v2.3, 28
    levels) the phone's title screen still fit, with little room left.
    Chosen (2026-10-16): a **scrolling list** of chapters between the
    header and the selected level's line, so the screen no longer shrinks
    for its height (`src/render/ScrollView.ts`; docs/DESIGN.md, *Title
    screen and progress*). New pieces can add chapters freely

### Presentation, second pass

Planned 2026-10-11. Subjective choices are made from variants on a visual
lab page and a sound lab page (artifacts), all chosen on 2026-10-11, then
written into `docs/DESIGN.md` as each item is built. Every new effect is still under reduced motion, follows
the polyline rule and is checked on a phone. In suggested order:

- [x] Scene transitions between the title screen and levels (now an
  instant cut), with the level-start sound. Chosen: beam wipe, a laser
  line sweeping across to reveal the new screen (about 0.5 s; back to the
  title it sweeps the other way)
- [x] Level start: the board builds in. Chosen: column sweep, where
  emitters slide in, cells pop in column by column from the left and the
  goal ignites last with a flash (about 0.7 s)
- [x] Hit feedback on the beam. Chosen: a short flash where it reflects
  and a glint running along the mirror as it turns; a few sparks bouncing
  back from a wall; a small (2 px) board shake when a breakable wall
  breaks
- [x] Goal hits. Chosen: a crystal flash and one diamond-shaped ring on
  every goal hit, not only at par (stars stay for par); on multi-hit goals
  the crystal's core fills from the bottom, a part per hit
- [x] Stereo position: bounces, wall hits and breaks panned by column.
  Chosen: light panning, up to 40 % to either side
- [x] Calmer level music: ambient tracks that don't distract from puzzling
  (no drums or tune to follow, slow chord changes, sparse random details),
  keeping the laser lab feel. First drafts with beats and tunes
  (2026-10-11) were too distracting. Chosen from the sound lab: title
  screen keeps *Night lab*; levels 1–4 *Afterglow* (warm pads with a
  slowly moving filter, occasional plucks); 5–10 *Glass garden* with
  sparse bells; 11–14 *Prism drift* (two swaying chords, shimmer, glassy
  bells); 15–18 *Photon* (dark pads crossed by soft gliding tones).
  *Pulse* was removed. Groups follow the mechanics, so new levels take
  their mechanic's track
- [x] Effects in tune with the music. Chosen: bounce pings climb the
  current track's scale; the goal chime uses the chord playing at the time
- [x] Beam head and light. Chosen: a short comet tail behind the moving
  front (about ¾ of a cell), and faint light on the panel under the
  beam's path, brightest around the front
- [x] Atmosphere around the board. Chosen: soft vignette, faint light
  behind the board, corner ticks with small labels (grid size, goal hits,
  par, level number); no glow
- [x] Title screen. Chosen: the title beam fires (shoots from the left,
  the title brightens as it passes, the crystal flashes), once as the
  screen appears (every few seconds was too distracting);
  a level list with an icon column (★, ✓, play, skip, lock) and scores
  aligned right; buttons ease in a soft glow on hover and squeeze slightly
  when pressed
- [x] Small sounds (no beam hum). Keep them quieter than on the sound lab
  page: in play, frequent sounds must not wear on the ear over many levels
  - [x] A sound as a level starts: a soft swoosh (the chosen rising sweep
    was too noticeable over many levels)
  - [x] A soft tick for row changes and menu moves (arrow keys only;
    pointer hover stays silent)
  - [x] A glass tap for button clicks
  - [x] A glass swish with the mirror flip
- [x] Review the older effects (fire, bounces, wall, off the board, goal,
  par) in long play: the softened level-start sound showed that sounds
  heard on every shot or level can wear on the ear. Chosen on sound lab 3:
  the *Softer* version of each (30–40 % quieter, a little rounder), with
  the overall effects level kept at 80 %
- [x] Ghost of the previous shot: when the next shot fires, the previous
  path stays until the shot after. Wanted, although it changes how puzzles
  play (shows what flipped). Chosen: a very dim band with small chevrons
  showing which way it went

### Game ending

- [x] A hint, once every level is at par, that there is more to find
  (2026-10-18), without naming the bonus targets: a second line under
  the "All levels at par!" banner (REPLAY A LEVEL: SOMETHING NEW
  AWAITS), the same in the message under the board, and `GOLDEN ★ 0/45`
  in the level list header from then on

The last bonus target is always the end of the game: bonus targets
appear only once a level is at par, so by then every star is earned.
Until v1.9 it got the par finale in other colours. Chosen on the finale
lab page on 2026-10-11:

- [x] The moment: the gem splits the beam into a fan of six coloured
  rays, one by one, that sweeps slowly across the screen (*Prism fan*),
  while a six-colour ring spreads over the board, giving each mirror it
  passes a half turn (so the board is unchanged) and flashing the other
  pieces (*Board wave*). Instead of falling stars, specks of coloured
  light drift upwards (*Light dust*)
- [x] Banner: its letters light up in the bonus colours as a white light
  sweeps across them, and it stays a little longer, with a quiet second
  line, THANK YOU FOR PLAYING
- [x] Sound: six bells, one with each ray of the fan, then a swelling
  chord on the music's key made major (*Prism bells*); the music fades
  out while the ending rings and comes back slowly (*Rests*)
- [x] Title screen afterwards: the header adds ALL FOUND! in the bonus
  colours, and the title beam ends in the bonus gem, which splits it
  into a small, still fan of the six colours (*Prism crystal*)

### Presentation, third pass: a memorable lab

Planned 2026-10-18. The graphics looked fine but weren't memorable: a
flat panel with glowing icons could be any game. Option chosen: keep the
Laser lab direction and give it depth, light and a signature moment.
Variants on visual lab 2 (an artifact, like the earlier lab pages), all
chosen on 2026-10-18 and written into `docs/DESIGN.md` as each is built.
As before, every effect works under reduced motion, follows the polyline
rule and is checked on a phone. In order:

- [x] Board surface: an optical table, a dark anodised breadboard with
  tapped holes at the cell corners instead of grid lines, a brushed sheen
  and four corner screws
- [x] Mirrors: a bevelled glass slab on a round steel mount with two
  adjuster screws, turning with it (glass mirrors on the same mount;
  fixed mirrors stay bolted to the table, without one)
- [x] Beam light: a faint haze around the beam with dust specks that show
  only where it crosses them, and lit pieces: mirrors it bounced off stay
  faintly warm, walls glow where it hit, and the table's holes near it
  catch its colour
- [x] Chapter light: each chapter its own room colour, on the light
  behind the board, the panel's edge and the table; Prism turns slowly
  through the bonus colours
- [x] Reaching the goal: green light runs back along the whole path to
  the emitter, the beam swells and the room brightens, then a soft wave
  of green spreads from the crystal across the table's holes
- [x] Title logo: the words step down diagonally, and the title beam
  bounces off two mirrors between DIAGON and PUZZLE on its way to the
  crystal
- [ ] Check every item on a phone

## Engineering track

### Next

- [x] Level design tools for the new pieces (2026-10-11, v1.31):
  `npm run bonus` no longer changes cells the par solution reaches (it
  kept only the rows of par, and once suggested removing the mirror
  level 19's (now 21) par shot turns on), and its `--uses` option keeps bonus
  routes that pass a given piece (reflector, glass, breakable, mirror);
  `npm run trace` prints a shot sequence's paths cell by cell on a level
  or any board; the generator's shot descriptions count shattered glass
- [x] Run the tests as part of `npm run build`, so a deployed build has always
  passed them
- [x] Move level state (phase, current board, shot count, restart, whether a
  shot may be fired) from `GameScene` into a pure `LevelSession` class in
  `src/game/` with tests; `GameScene` only displays it
- [x] Level design tool, `npm run levels`: prints each level's shortest
  solution, setup routes and first-shot outcome per row (runs with `tsx`)
- [x] Level generator, `npm run generate`: searches random boards for a given
  par and size, preferring a unique shortest solution
- [x] Move the progress rules out of `main.ts` into a pure class in
  `src/save/` with tests, as `LevelSession` did for `GameScene`: when a
  skip is given back (first completion, first bonus target), when bonus
  targets are shown (after an earlier visit reached par), "newly golden",
  "all levels at par" and "all bonuses", counting level time for skips
  and how often it is saved. `main.ts` then only connects scenes and
  storage
  - First write tests for the current behaviour, then move the code
    until they pass: skip returned on a first completion but not on a
    replay, a bonus target collected twice, the last star triggering
    "all at par", bonus targets hidden until an earlier visit reached
    par, the hidden skip using none of the visible skips, and the save
    interval for the skip timer
  - Keep the before/after order of the checks: "all at par", "all
    bonuses" and "newly golden" compare the progress from before the
    event with the progress after it
  - The class is the only owner of the progress, reset included, so no
    stale copy is left in `main.ts`; it tells `main.ts` what happened
    and whether to save (every 5 s for the skip timer, at once when a
    skip comes back; never every frame)
  - Don't change the saved format (`serializeProgress`,
    `parseProgress`) or level ids
  - The class defines the completion and bonus result types, replacing
    `GameScene`'s `CompletionResult`, whose name clashes with the one in
    `progress.ts`
- [x] Split `src/render/BoardView.ts` (over 1000 lines) before adding
  block types: cell drawing into its own module, one draw function per
  cell type (mirroring `src/game/cells.ts`), and the particle effects
  (sparks, debris, sparkles) into another. No visible change; check it
  in the browser and on a phone afterwards
  - Move code rather than rewrite drawing, so the phone-only line bugs
    can't come back
  - Keep the layer order (effects between the cells and the beam) and
    the single bloom filter on `BoardView`: no new filters, nothing
    moved above the beam
  - Keep a mirror hit again while still turning continuing from its
    current angle (`changeCell`), the reduced-motion checks, and
    destroying every effect's graphics when the level ends
  - Map every cell type to its draw function (`Record<CellType, …>`),
    so a new block type without drawing fails `npm run build`; the same
    exhaustive check in `src/game/cells.ts` and the parser
  - List in `docs/WORKFLOW.md` what a new block type needs: `types.ts`,
    `cells.ts`, `parse.ts`, cell drawing, its sound in
    `audio/effects.ts`, `pathPoints.ts`, and `docs/DESIGN.md`
  - Optional: separate the particles' motion from their drawing and
    test it, as `ambient.ts` and `intro.ts` are
- [x] Move choosing the player mirror's cell out of `GameScene` into a
  pure class in `src/game/` with tests, before the mirror can be rotated
  (that mechanic extends this code). Today these rules sit untested in
  the scene: a mouse click places at once; on touch a first tap previews
  and a second tap on the same cell places; P starts the keyboard cursor
  on an empty cell in the selected row (else the first empty cell),
  arrows move it within the board, P or Enter places and Esc cancels.
  `GameScene` then only shows the cursor and plays sounds
  - Also move choosing the level's opening message (`introMessage()`:
    bonus target, player mirror, multi-hit goal, breakable walls, in
    that order) into a tested pure function, e.g. in `scoreText.ts`
- [x] Small test gaps and clean-ups, as one batch:
  - Test the order of `bonusPositions()` (reading order): saved
    progress identifies a collected bonus target by its index in it, so
    a change would silently move saved bonus targets to other cells
  - Keyboard: move the key → action lookup out of the listener in
    `src/input/keyboard.ts` into a pure function and test it (Shift+N is
    the hidden skip, Ctrl/Alt/Meta keys are ignored, fire, restart and
    the other one-shot actions don't repeat while held)
  - Test that `src/save/storage.ts` works when `localStorage` throws or
    is missing (reads give null, writes and removes do nothing)
  - Remove the `GameProgress` test "turns a skipped level into a
    completed one", which repeats `progress.test.ts`
  - Move the easing tests from `intro.test.ts` into `easing.test.ts`
  - Comment in `src/game/simulate.ts` that the `loop` outcome appears
    unreachable: every step of the pellet can be traced back exactly, so
    a pellet entering from the edge must leave or stop (about 700,000
    random shots found no loop). The check stays as a guard; no test can
    build a loop
  - Left for later: the pellet animation's timing (`PelletAnimator`:
    cells change as the pellet reaches them, then the shot finishes);
    the board it leaves is now checked after every move by the browser
    smoke tests' level play-through;
    `placementPositions()` and the title screen's menu choices are
    small enough to leave (`scripts/levelAnalysis.ts`'s `describeShot()`
    and `rowList()` got tests with the coverage gaps below)
- [x] Versioned uploads: the build puts the game in `dist/<version>/` and
  a main page in `dist/index.html` that plays it through a `<base>` tag,
  so the site's main address plays the newest upload and older version
  folders stay online as snapshots
- [x] Release on GitHub Pages (`docs/WORKFLOW.md`, *Release on GitHub
  Pages*), for the versions chosen for players:
  - [x] Workflow `.github/workflows/pages.yml`: a published GitHub
    Release of a version tag (or *Run workflow* with a version) runs
    `npm run build` and the full browser set, then adds the version
    folder and the main page to the `gh-pages` branch, keeping older
    version folders as snapshots
  - [x] GitHub is updated only by hand, with `npm run github`
    (`scripts/push-github.sh`): it shows the commits, files and tags
    GitHub doesn't have yet, warns about added lines that look private
    and asks before pushing; the commit hook pushes only to the backup
  - [x] Create the GitHub repo, push, make the first release by hand
    and turn on Pages: https://eisiishai.github.io/diagonpuzzle/, first
    release v2.13 (2026-10-16). Git signs in through Git Credential
    Manager; `gh` stays logged out (plain-text token in WSL)
  - [x] Browser tests pass on GitHub's machines (no GPU, 4 slow cores,
    about 3 frames a second): traces only on a retry, longer limits
    there, the game's time keeping up at low frame rates under `?e2e`
- [x] Test setups for the once-per-player moments, on a desktop or a
  phone (2026-10-18): `?setup=all-par`, `all-bonus` and `prism` in the
  address replace the saved progress with one a step short of the
  moment, after the browser asks; `?setup=restore` brings the player's
  own back. Built from the level list, so they replace the console
  snippets that listed every level by hand (`docs/WORKFLOW.md`, *Test
  setups*)

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
    whose key move is easy to see (16) and those repeating a row (8, 11).
    Compare it with how testers actually do, then refine it (e.g. weight
    moves a player would try first) or add a second measure
  - [x] Second measure, foresight: the changes the par solution makes
    for its later shots (*Difficulty curve* above), next to the odds in
    `npm run levels`
  - [ ] Review how difficulty is calculated, looking for a method that
    better matches the difficulty people feel (the 2026-10-17 review of
    all 40 levels, *Difficulty curve* above, found its limits). Known
    weaknesses: with a unique solution the odds are just rows^par, so
    they depend on board height and par more than on the puzzle; random
    placement of the player's mirror inflates those levels' odds;
    neither measure sees how hard a board is to read (kinds of pieces,
    board size, path length and turns, portal jumps) or how obvious the
    key move is. Ideas to compare:
    - A simulated player that tries plausible shots first (rows whose
      pellet reaches new cells or nears the goal, not ones that exit
      at once) and counts the shots or states it needs, instead of
      uniform random play
    - The solver's search effort with obviously useless moves pruned
    - A score combining a few board features (piece kinds, path length,
      shots that must be planned ahead) with weights fitted to testers
    - Calibrating whichever is chosen against real play: testers'
      attempts and time per level, or the shot counts the game saves
      (best shots only, so a count of attempts would need adding)
- [x] Unit test coverage, `npm run coverage` (`@vitest/coverage-v8`):
  the rules are nearly fully covered (`src/game/` 97% of branches,
  `src/levels/` and `src/save/` 100%); drawing, scenes and audio are
  covered by the browser smoke tests instead
  - [x] Tests for the gaps it showed that were worth closing: the
    keyboard listener (used keys don't scroll the page; unbinding),
    the cursor's left arrow, random-play odds with the mirror in hand
    and no empty cell, the generator's seed 0, the level tools'
    "no solution within par" errors, and `describeShot()` and
    `rowList()`. Left uncovered on purpose: Web Audio synthesis, the
    unreachable `loop` guard and empty path, and the reduced-motion
    query read once on loading
  - [x] Coverage from the browser smoke tests too, `npm run
    e2e:coverage`: Chromium's coverage through Playwright, mapped to the
    sources with `monocart-coverage-reports`. 85% of statements and 78%
    of branches at v1.19, 97% and 91% at v1.20 after the tests below
    - [x] Coverage lost on a page reload: what a page ran before
      reloading was dropped, so the first report undercounted tests that
      reload. `Game.reload()` now adds it to the report first
    - [x] Smoke tests with motion on (`e2e/motion.e2e.ts`): a level
      with mirrors and a breakable wall from the title and back, and the
      finale, so that motion code runs in a test and its errors fail it
    - [x] Smoke tests for controls no test used: M and F on a level and
      the title, the title's left arrow, Esc cancelling the choice of
      the mirror's cell, the hidden skip by holding the level's name
      (its position added to the test hook), and *No skips left* with a
      skip given back after time on levels
  - [x] Mutation testing (Stryker), `npm run mutation`, of `src/game/`,
    `src/save/` and `src/levels/parse.ts` (run on 2026-10-11, v1.21).
    The first run caught 89.6% of 926 mutants; tests for the real gaps
    raised it to 94.2%. The gaps: completing one skipped level cleared
    every skip, continuing from a skipped level other than the first,
    malformed saves (JSON that isn't an object, a wrong version with
    levels in it, bad `skipped` and `bonuses` entries), the saved wait
    for a skip back, restart in a level without a player mirror, a
    second tap on another cell in the same row or column, a tap on a
    full cell, the cursor's up and down edges, a winning first shot in
    setup routes, and error messages. *Mutation testing* below lists
    the 54 survivors known to be equivalent
  - [ ] Optional: coverage thresholds for `src/game/`, `src/levels/` and
    `src/save/` in `npm run build`, so a drop stops the commit
- [x] A smoke test of the website's layout: the smoke tests' build
  (`dist-e2e/`) gets the same main page and version folder as `dist/`,
  so every test plays through the main page, and one checks that it
  loads everything from the version folder and that the folder's own
  page works too
- [x] Smoke tests in WebKit, Safari's engine, which iPhones and iPads
  use for every browser, to catch Safari-only problems with the canvas
  and Web Audio that Chromium can't show: the desktop tests as the
  `webkit` Playwright project, in `npm run e2e:full` and so in the
  GitHub release run, not in the commit checks (about 1.5 minutes).
  Needs WebKit and its system libraries (*Setup on a new machine* in
  `docs/WORKFLOW.md`). WebKit has no mute switch, so its sound goes to a
  sound server that doesn't exist; in WSL it played through the
  speakers. Still not a real iPhone: phone GPU bugs stay a manual check
- [ ] Phone smoke tests in WebKit (e.g. Playwright's `iPhone 14`), for
  touch: `phone.e2e.ts` swipes through Chromium's own input events,
  which WebKit doesn't have, so it needs another way to swipe
- [ ] Watch the solver's and `npm run generate`'s run times as placeable
  blocks grow: each placement option multiplies the choices before every
  shot, and the tests check every level with the solver. All tests take
  under 1 s at v1.0, so not a problem yet
- [x] Automated browser smoke tests with Playwright (`npm run e2e`,
  `npm run e2e:full`, `e2e/`), and `npm run screenshots` for looking
  over the main screens.
  Run and details in `docs/WORKFLOW.md`, *2. Check*. Built on 2026-10-11:
  - 13 tests at desktop and phone size, about 30 s: the title screen and
    level list, *Play*, *Continue* and level buttons, completing level 1
    with the mouse, keyboard and taps, restart, the player's mirror placed
    with the mouse, keyboard and two taps, both skips, progress after a
    reload, localStorage blocked, and everything fitting a phone screen.
    Any console error or uncaught exception fails a test
  - Every level played through by its shortest solution, checking after
    every move that the board matches the rules both as the level's state
    and as drawn (a mirror's direction read from its rotation; a turn
    left a quarter short was caught). In `npm run e2e:full` only: 30
    tests in all, about 2 minutes
  - A test hook (`src/testHook.ts`, a separate file loaded only with
    `?e2e`) reports the scene, its buttons and the level's state with
    screen positions; tests play levels by the solver's solutions, so they
    keep working when levels change
  - Limits that remain: rendering is in software, so phone GPU bugs (the
    stray lines the polyline rule guards against) don't show, and phone
    checks stay; sound is only checked for not causing errors; nothing
    compares pictures, the screenshots are for looking at. Software
    rendering is slow: the tests run 4 browsers at once and the phone at
    pixel density 1 (2.6 ran the title screen at 4–5 frames a second,
    which slows the game's own time)
  - The quick set (19 tests, about 50 s) runs in the pre-commit hook when
    a commit changes the game; doc-only commits skip it. The full set
    runs by hand before a release and after changes to drawing, levels or
    block types
- [x] Browser tests for interrupting a shot, in the quick set
  (`e2e/game.e2e.ts`): while the pellet is still moving, restart (R and
  the button), leave with Menu/Esc, use the hidden skip (Shift+N), and
  fire again (ignored until the shot finishes). Switching scenes or
  resetting the board mid-animation is where errors from destroyed
  objects or leftover effects would appear, and only a browser shows
  them
  - Check after each: no console error, the expected screen, and after a
    restart the starting board both by the rules and as drawn (`shown` in
    the test hook), with no shot or goal hit counted
  - Restarting mid-shot is on the manual checklist in
    `docs/WORKFLOW.md`, *2. Check*; take it off once covered here
  - Done: 6 tests. The pellet's flight took about 1.6 s while the test's
    input took about 1.35 s, so it sometimes arrived too late; the test
    hook now sets the game's speed (`setSpeed`), and the shot is slowed
    to a tenth while interrupted. A restart that left the shot running
    was caught (wrong mirrors and console errors). Taken off the manual
    checklist
- [x] More browser tests, suggested on 2026-10-11 while adding the
  others:
  - Bonus targets: hidden on a first visit, shown after completing the
    level at par, collected by the solver's bonus route
    (`solveBonusMoves()`), the level's star turning golden in the list
  - The big celebrations: from saved progress with every level but one
    at par, earning the last star plays *All levels at par*; likewise
    *All bonus targets found*. These run once per player, so a crash in
    them would hardly ever be seen when playing by hand
  - Smaller ones: *Reset progress* (the confirming second press, and
    that it erases the saved progress), music and sound settings kept
    after a reload, and resizing the window or turning a phone mid-level
    (everything still fits and responds to taps)
  - Done: 7 tests in the quick set (`e2e/progress.e2e.ts`, and turning
    the phone in `e2e/phone.e2e.ts`), all on level 1, whose solution and
    bonus route take one shot each; the celebrations start from seeded
    progress. The test hook now also reports the title screen's level
    rows and header and the celebration's banner. Each test was checked
    to fail with its feature broken (celebrations, reset)

### Mutation testing

The 49 mutants of 1163 that survive `npm run mutation` at v3.11
(2026-10-18; 54 of 926 at v1.21), checked one by one: none changes
anything a player or the rules could notice. A later run that lists
others has found something new. The v3.11 run's new survivors got tests
instead: portals one above the other (finding the partner by its column
alone passed every test), `boardHas()` on a board where only one row has
the cell, `FIXED_MIRRORS`, and the texts of three error messages.

- `progress.ts` (17): parse checks that a later check repeats (`typeof
  x === "number"` before `Number.isInteger(x)`, `"x" in data` before
  `typeof data.x`, `json === null` and the `JSON.parse` catch before
  the object check, `typeof levels` before reading its entries), and
  `best !== undefined` before `earnsStar(best, …)`, false for
  `undefined` anyway. Likewise `GameProgress.ts:92`
- `solver.ts` (13): the `seen` set and the player-mirror guards only
  save work; the bonus-hit check's parts
  repeat each other, as only a bonus cell gives a `bonus` outcome
- `simulate.ts` (6): the `loop` guard, which can't happen, and the
  board key's separators
- `LevelSession.ts` (4): `place()`'s player-mirror check, repeated by
  `canPlace()`, and `finishShot()`'s two conditions, which are always
  true or false together
- `MirrorPlacement.ts` (3): the tap's `by: "touch"` (only "keyboard" is
  ever checked), an optional chaining the line before guards, and the
  fallback cell for a board with no empty cell, which no level has
- `placement.ts` (2), `bonus.ts`, `cells.ts`, `parse.ts` (1 each): an
  error message's text, an optional chaining, `undefined` for `false`,
  the `pass` kind (anything but `stop` passes) and the goal counter
  (only zero matters)

## Discarded ideas

Ideas that were tried, designed or just considered and then dropped, with
the reason, so they aren't proposed again without new arguments. Each
could come back if the reason no longer holds.

- **Fixed mirror slots** (2026-10-10): a level marked a cell (`n` for `\`,
  `z` for `/`) where the player could place a mirror once; the player
  chose only *when* to place it. Built and playable, but never released:
  replaced by the player-placed mirror on any empty cell before it was
  committed. Reason: no use was seen for a fixed position once the mirror can go
  on any empty cell, which was the intended mechanic.
- **Firing from other edges** (2026-10-10): launch positions on the top,
  right or bottom edge as well as the left. Never designed or built.
  Reason: the left edge already offers enough options; more edges would
  add complexity and difficulty in ways that aren't seen as useful, at
  least for now.
- **Rotating the placed mirror** (2026-10-11): letting the player choose
  `\` or `/` for their placed mirror. Never designed or built. Reason:
  the fixed-direction mirror is already difficult enough for players
  without rotation, and rotation would be hard to make intuitive if some
  levels allowed it and others didn't.
- **Splitter** (2026-10-11): a half-silvered mirror that splits the
  pellet into two beams. Never designed or built. Reason: too complex.
  The simulation, animation and solver all assume one beam, and it
  raises rule questions such as which beam flips a shared mirror first.
- **Pushable block** (2026-10-11): a block the pellet pushes one cell
  along. Never designed or built. Reason: too complex: it would greatly
  enlarge the solver's search and be hard to animate cleanly.
- **Reinforced wall** (2026-10-11): a breakable wall that needs two hits,
  showing a crack after the first. Never designed or built. Reason: not
  interesting enough: the two-hit goal already covers a mechanic of
  hitting the same thing more than once.
- **Linked mirrors** (2026-10-11): mirrors of one colour that all flip
  when any of them is hit. Never designed or built. Reason: too confusing
  for the player, since one hit would change mirrors far from the
  pellet's path.
