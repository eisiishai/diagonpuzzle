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
settle the items that wait on how people play: the step to *Rebuild*,
level 7's dip and the difficulty measure.

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
  - [ ] More mirrors per level, or other placeable blocks
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

Measured on 2026-10-10 (v0.34) by `npm run levels`, level 17 added and level 18 given alternatives on
2026-10-11, which ends with this
curve: the chance that random play completes a level within par (a random
row each shot; in player-mirror levels a random cell for the mirror, or
keeping it). Lower is harder. It dips at each new mechanic (5, 11,
13, 15, 17), as intended:

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| 1 in | 5 | 6 | 25 | 36 | 16 | 64 | 36 | 343 | 343 |

| Level | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 |
|---|---|---|---|---|---|---|---|---|---|
| 1 in | 2,048 | 216 | 2,401 | 125 | 7,776 | 112 | 3,333 | 2,553 | 45,000 |

Random odds understate how easy level 15 feels (the mirror's cell is easy
to see) and overstate levels that repeat a row (8, 11).

Foresight (added 2026-10-11, also in `npm run levels`): how many cells
the par solution changes, flipping a mirror, breaking a wall or placing
the player's mirror, that a later shot then passes through. It measures
how much a solution must plan ahead, which random odds miss. It counts
the solver's par solution only, and not the second goal hit:

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Foresight | 0 | 0 | 1 | 2 | 1 | 2 | 2 | 2 | 3 | 5 | 3 | 3 | 2 | 5 | 1 | 3 | 4 | 2 |

The two agree that 10 and 14 are the hardest of 1–14. They disagree on
*Rebuild* (18): the hardest by odds, but a foresight of only 2, so its
difficulty is in finding the moves, not in planning their effects.

- [x] Smooth the step to *Rebuild* (then level 17), about 14 times
  harder than 16 and 6 times harder than 14: a bridge level,
  *Clear the way* (par 3), now level 17, combines the same three
  mechanics (breakable walls, player mirror, two-hit goal) in an easy
  first form. Found with `npm run generate -- --player-mirror slash
  --breakable 2 --goal-hits 2 --shots 3 --width 5 --height 5 --mirrors 5
  --walls 1`; its bonus target with `npm run bonus -- --changes 1`
  - [ ] By random-play odds the bridge level is about as hard as 16, so
    the step from it to *Rebuild* (18) is now about 18 times. The
    bridge teaches the combination rather than the difficulty; whether
    18 still feels too steep is best judged by playing it (or seeing
    testers play it)
- [ ] Optional: level 7 is a slight dip after levels 5–6 (as hard as 4)
- [x] Alternative solutions one shot above par, so a player who strays
  from the par route can still finish: `npm run alternatives` lists them
  and finds board changes that add them. Levels 3, 9, 13 and 18 got one
  added mirror each with a route different from par; levels 6 and 8 one
  that lets a player recover after the par route's first shots (8's
  replaces the wall at (1,7)). Par, par solutions and bonus targets are
  unchanged; 18's random-play odds went from 1 in 47,500 to 45,000.
  Levels 4 and 7 got two added mirrors each, for a route that starts
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
  - [x] Second measure, foresight: the changes the par solution makes
    for its later shots (*Difficulty curve* above), next to the odds in
    `npm run levels`
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
- [ ] Smoke tests in WebKit, Safari's engine, which iPhones and iPads
  use for every browser: the quick set run as a Playwright project with
  WebKit next to Chromium, desktop and phone (e.g. Playwright's
  `iPhone 14`). It would catch Safari-only problems with the canvas,
  touch and Web Audio that Chromium can't show. Needs WebKit and its
  system libraries installed in WSL (`npx playwright install webkit`,
  then the apt packages it names: with nvm, `sudo` can't find `npx` for
  `install-deps`, as in *Setup on a new machine* in `docs/WORKFLOW.md`),
  and adds to the commit checks' time unless run only by hand.
  Still not a real iPhone: phone GPU bugs stay a manual check
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

The 54 mutants that survive `npm run mutation` at v1.21, checked one by
one: none changes anything a player or the rules could notice. A later
run that lists others has found something new.

- `progress.ts` (17): parse checks that a later check repeats (`typeof
  x === "number"` before `Number.isInteger(x)`, `"x" in data` before
  `typeof data.x`, `json === null` and the `JSON.parse` catch before
  the object check, `typeof levels` before reading its entries), and
  `best !== undefined` before `earnsStar(best, …)`, false for
  `undefined` anyway. Likewise `GameProgress.ts:92`
- `solver.ts` (13): the `seen` sets, `frontier.length > 0` and the
  player-mirror guards only save work; the bonus-hit check's parts
  repeat each other, as only a bonus cell gives a `bonus` outcome
- `simulate.ts` (6): the `loop` guard, which can't happen, and the
  board key's separators
- `board.ts` (5): `isInside()`'s column checks: reading past a row's ends
  gives `undefined` anyway
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
