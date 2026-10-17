# Workflow

How to develop, check, commit, back up and release the game. Committing on
`main` runs the checks, tags the version and pushes to the backup through git
hooks; every other step is a command run by hand.

## Setup on a new machine

Requirements: WSL Ubuntu (or Linux), Node.js installed on the Linux side with
nvm, not Windows' Node. Check with `which node npm`: both should be under
`~/.nvm/`.

```bash
git clone -o backup <backup repo> diagonpuzzle
cd diagonpuzzle
npm install          # also enables the git hooks (see Versions)
npm run build        # confirms everything works
```

`<backup repo>` is the bare repository on the backup disk
(`/mnt/<drive>/…/diagonpuzzle.git`); `docs/backup.local.md`, git-ignored,
has the exact command, and on an existing clone `git remote get-url backup`
shows it.
`-o backup` names the remote `backup`, the name the hooks push to (see
*4. Back up*). For GitHub, add its remote and login as well (see *Release
on GitHub Pages*).

For the browser smoke tests (`npm run e2e`, see *2. Check*) also install
Playwright's Chromium, the system libraries it needs and fonts. With nvm,
`sudo` can't find `npx` on its own, so the second line passes it the
`PATH`:

```bash
npx playwright install chromium
sudo env PATH="$PATH" npx playwright install-deps chromium
sudo apt-get install fonts-liberation fonts-noto-color-emoji fonts-freefont-ttf
```

Keep the project on the Linux filesystem (in your home folder), not
under `/mnt/c` or another Windows drive: it is much faster there, and Vite's
file watching works reliably.

## 1. Develop

```bash
npm run dev          # dev server at http://localhost:8080, reloads on save
```

- Open the URL in the Windows browser; WSL forwards `localhost`.
- When designing or changing levels, run `npm run levels`. It reports each
  level's shortest solution, an alternative solution above par (a ✗ if
  none within par + 2), two-shot setup routes, two rough difficulty
  measures (how likely random play is to finish within par, "1 in N",
  and the foresight the shortest solution needs: how many cells one move
  changes, a flipped mirror, a broken wall or the placed player mirror,
  that a later shot then passes through) and what each
  row's first shot does, and marks with ✗ any level whose declared
  `minShots` doesn't match the solver. It ends with the difficulty of every
  level in a row, to see where a new level fits in the curve. Random odds
  measure how many plays there are; foresight how much a solution must
  plan ahead, which the odds understate (e.g. an easy-to-see key move).
- To find a new level, run `npm run generate` with the size, number of
  mirrors and walls, and par wanted (`npm run generate -- --help` lists the
  options), for example:
  ```bash
  npm run generate -- --width 7 --height 6 --mirrors 8 --shots 3
  ```
  It tries random boards and prints the best ones first: a single shortest
  solution, and few rows that reach the goal with the first shot. It shows
  only boards with an alternative solution within two shots above par
  (`--alternatives N` for another limit, `0` to show every board), so a
  player who strays from par can still finish. Each board is printed as a
  `grid:` block to paste into `src/levels/levels.ts`, with its solution and
  its alternative. Try other `--seed` values for different boards, then adjust the
  board by hand and check it with `npm run levels`.
- The generator's best boards still need a look before one is chosen:
  play their solutions with `npm run trace` (it prints each shot's cells,
  with `⇒` where the pellet comes out of a portal). Options that drop
  the usual misses:
  - `--varied-rows`: no shortest solution fires one row only. Repeating a
    row makes random play look harder than the level is
  - `--portal-gap N`: the portals at least N cells apart (default 2).
    Portals side by side make the beam's jump hard to see
  - `--return-trip`: a shot goes through the portals, off a reflector and
    back through them
  - `--bonus-needs portal` (or another piece): only boards that already
    have a bonus target that needs the piece; it prints the target in the
    grid and its `bonusShots`. Slower: it searches every board for one
- Random odds have a ceiling: with R rows and par P, random play can't do
  worse than 1 in R^P (1 in 125 for five rows at par 3). For a level
  harder than that, raise par or add a row; foresight (`npm run levels`)
  measures the planning a level needs regardless.
- For levels with a player-placed mirror, add `--player-mirror slash` (or
  `backslash`): only boards that need the mirror for par are kept, and
  `--place-later` also drops boards where a shortest solution places it
  before the first shot. Solutions show a placement as `place the /
  mirror at (column,row)`; copy the printed `playerMirror` line into the
  level too. These searches are slower: try `--tries 4000` (about 15 s
  for a 6×5 board at par 3).
- The generator doesn't place bonus targets. Once the level is in
  `src/levels/levels.ts`, run `npm run bonus -- --level N` to find cells
  for its `*` (`--help` lists the options), for example:
  ```bash
  npm run bonus -- --level 14 --shots 4 --changes 1
  ```
  It lists empty cells that the par solution never passes through and that
  the pellet first reaches after `--shots` shots (default: the level's
  `bonusShots`, else par+1; see *Bonus targets* in `docs/DESIGN.md` for the
  usual number). Cells with the fewest routes come first; one route is
  best. With `--changes 1` or `2` it also tries changing that many board
  cells first, keeping par, the par solution and the number of shortest
  solutions. Paste the printed grid, set `bonusShots` and confirm with
  `npm run levels`.
- A bonus target in a chapter's levels should need the chapter's piece,
  not only be reachable along a route through it: find it with `npm run
  bonus -- --needs portal` (the piece's name; `--uses` only checks that
  a route passes the piece). Portal levels have a test for it. If no cell
  works even with `--changes 2`, the board itself rules it out (the cells
  the piece leads to are on the par route or out of reach): rather than
  search longer, pick a new board with `npm run generate --
  --bonus-needs portal` (level 38 got its board that way; level 25's
  bonus target needs its reflector, level 30's its glass and level 33's
  its fixed mirrors the same way).
- To see the different ways to solve the levels, run `npm run
  alternatives` (`--help` lists the options). Without `--level` it counts,
  for every level, the solutions at par and with one more shot
  (`--extra 2` for two more). A solution counts only if no shot in it can
  be left out, and shots taking the same paths in another order count
  once. With `--level N --changes 1` (or `2`) it also lists board changes
  that add new solutions while keeping par, the par solution and the
  bonus target's cell and shots, for example:
  ```bash
  npm run alternatives -- --level 9 --changes 1
  ```
  Changes adding solutions only above par come first: those give a
  player who strays from the par route another way to finish, without
  making par easier. Every level needs an alternative within par + 2
  (the tests check it); use this when a hand-tuned board has lost its. Each shows how many solutions it adds and the
  random-play difficulty after it.
- In player-mirror levels the mirror can make nearly every cell reachable
  in the first shot, so a bonus target needing more shots than par is
  rare without board changes. Level 20 needed `--changes 2`, which took
  about 7 minutes; with `--changes 1` about 13 seconds (level 19 got its
  target that way, with one mirror added). Run long searches
  in the background.
- A new level touches these places besides its entry in
  `src/levels/levels.ts` (a new `id`; `music` from its mechanic's group,
  see *Sound* in `docs/DESIGN.md`). It may go anywhere in the list, also
  between released levels: progress is saved by `id`, and a level after
  it stays unlocked once passed. It joins the chapter it is placed in
  (`CHAPTERS` in the same file; a chapter holds at most six levels, one
  row of tiles); a new mechanic starts a new chapter there, named after
  it.
  - `src/levels/levels.test.ts`: the lists of levels with a setup route
    or needing a breakable wall broken, if it belongs in one
  - `docs/DESIGN.md`: the level table (and renumber the levels after it),
    the counts and ranges that mention level numbers (bonus targets,
    music groups, how levels were found)
  - `docs/ROADMAP.md`: the difficulty curve table, from `npm run levels`
  - The console snippet in *Seeing the game's ending by hand* below
  - Run `npm run e2e:full`, which plays every level through
- A new block type (cell type) touches these places, after its design in
  `docs/DESIGN.md` (rule, grid symbol, look). Only the first four are
  checked by the build; go through the rest by hand:
  - `src/game/types.ts`: add it to `CellType`. `npm run build` then fails
    until each of the next three has an entry for it:
    - `src/game/cells.ts`: what a pellet entering it does
      (`CELL_BEHAVIORS`) and what kind of bounce it makes, if it turns the
      pellet (`BOUNCE_KINDS`); also add it to a group there (`MIRRORS`,
      `GLASS_MIRRORS`, `FIXED_MIRRORS`) or start one, if levels will be
      built around it
    - `src/levels/parse.ts`: its symbol in level grids
    - `src/render/cellGraphics.ts`: how it is drawn
  - If it stops the pellet or changes when hit, check
    `src/render/pathPoints.ts` (where the beam ends, which cell changes),
    `BoardView.changeCell()`, and `BoardEffects` for an effect such as
    the debris of a breaking wall
  - Its sound in `src/audio/effects.ts` (a new `BounceKind` if it turns
    the pellet), and which sound and message `GameScene.finishShot()`
    gives for it. A new piece gets its own hit sound and its chapter its
    own music track, chosen on a sound lab page (variants with a
    suggestion; the user pastes back the picks); until then it borrows
    the mirror bell and an existing track. The sound lab pages are not in
    the repository: they are private artifacts on the user's claude.ai
    account, titled "Diagon Puzzle Sound Lab N" (list them with the
    Artifact tool). Build the next one from the newest: it carries its
    own copy of the game's synth (`synth.ts`) and mix (`GameAudio.ts`),
    so the variants sound as they will in the game. Each lab shows the
    current sound as "now", marks the suggestion with a dot, has a demo
    shot strip for hit sounds and a button that plays the chapter
    change from the previous chapter's track, and a bar whose *Copy
    picks* gives the text to paste back. When building the picks into
    the game, make a track's occasional detail a little quieter and
    rarer than on the lab page (about 10 % on both); every track since
    sound lab 4 has been
  - Ambient motion, if any: `BoardView.updateAmbient()`
  - The first level using it: an intro message in `introMessage()`
    (`src/scenes/scoreText.ts`, newest piece first) and its fact in
    `GameScene.introMessage()`
  - `src/levels/levels.test.ts`: a "needs a … " test, so every level
    with it can't reach par with it swapped for a plainer piece, and one
    that its levels' bonus targets need it too (as "needs its portals
    for the bonus target")
  - The level tools, for searching levels with it: the same swap in
    `SWAPS` in `scripts/pieces.ts` (so `npm run bonus` and `npm run
    alternatives` keep it needed), an option in `scripts/levelGenerator.ts`
    and `scripts/generate.ts` (as `--fixed`), a name for `--uses` and
    `--needs` in `scripts/bonus.ts` and for `--bonus-needs` in
    `scripts/generate.ts`, and its group in the pieces list of
    `findAlternativeChanges()` (`scripts/alternativeSearch.ts`)
  - A screenshot of its first level in `e2e/screenshots.e2e.ts`
- To look up a level's solution, open `docs/solutions.local.md`: a table of
  every level's par, solution and setup routes, and each level's grid with its
  solution shot by shot. It is generated by `npm run solutions` and by every
  `npm run build`, so it is always current after a commit. It is git-ignored
  and never part of `dist/`, so it is neither committed, backed up nor
  published; regenerate it any time.

## 2. Check

| Command | Checks |
|---|---|
| `npm test` | Unit tests (Vitest) |
| `npm run coverage` | The unit tests, and which code they run (below). |
| `npm run lint` | ESLint and Prettier formatting |
| `npm run build` | Lint, TypeScript type check, unit tests, the solutions file, then builds `dist/`. Stops at the first failure. |
| `npm run e2e` | Quick browser smoke tests (Playwright, headless Chromium): every screen and flow at desktop and phone size. About 2 minutes. Run before commits that change the game (see *3. Commit*). |
| `npm run e2e:full` | The quick set plus every level played through. About 3½ minutes. |
| `npm run mutation` | Mutation testing of the rules: how well the unit tests check them (below). Minutes; run by hand. |
| `npm run e2e:coverage` | The full set, and which game code it runs in the browser (below). About 4 minutes. |
| `npm run screenshots` | Pictures of the main screens at desktop and phone size, in `screenshots/` (git-ignored). |

`npm run build` is the full check. **It runs automatically before every
commit** (see *3. Commit*); run it yourself any time to check earlier.

What the tests cover: game rules, simulation, solver, `LevelSession`, level
parser, saved progress and path geometry. Every level is checked against its
declared `minShots` with the solver, and levels 1–2 must keep their two-shot
setup route.

`npm run coverage` prints, for each file with code the unit tests don't
run, the share of statements, branches (each side of an `if`, `? :`,
`??`), functions and lines they do run, and the uncovered line numbers.
Fully covered files are left out of the table. Open
`coverage/index.html` in a browser for every file with each line marked
covered or not; `explorer.exe "$(wslpath -w coverage/index.html)"` opens it
in the Windows browser.

On 2026-10-11 (v1.17) the rules were nearly fully covered: `src/levels/`
and `src/save/` 100%, `src/game/` 99% of statements and 98% of
branches (what is left is the unreachable `loop` guard and a fallback). The PixiJS views, scenes and audio playback are mostly
uncovered, as expected: the browser smoke tests run them, and the
coverage report doesn't see those. Neither do the level design tools'
command-line parts (`scripts/levels.ts`, `generate.ts` and the like),
which are run by hand. Branch coverage is the most telling figure: a
line can run while one of its cases never does.

`npm run e2e:coverage` does the same for the browser smoke tests: it
runs the full set while Chromium records which code the game runs, and
maps that back to the TypeScript sources through the e2e build's source
maps (`monocart-coverage-reports`, set up in `e2e/coverage.ts` and the
`game` fixture in `e2e/game.ts`). It prints a table of the files with
uncovered code and writes `coverage-e2e/index.html`, to open in the
Windows browser like the unit test report. It covers the drawing, scenes
and audio that the unit tests can't reach; together the two show which
code no test runs. Run it now and then, e.g. before a larger release or
after big changes to scenes or drawing, not with every commit. The two
reports stay separate: Vitest's and Chromium's coverage can't be merged
into one.

On 2026-10-11 (v1.20) it ran 97% of statements and 91% of branches of
the game's code. What is left is mostly defensive fallbacks and errors
for malformed data (unit-tested). A page that reloads loses the coverage
of what it ran before, so `Game.reload()` in `e2e/game.ts` adds it to
the report first; reload through it, not `page.reload()`.

`npm run mutation` checks how well the unit tests check the rules, not
just whether they run them. Stryker (`stryker.config.json`) makes small
changes to the code one at a time, called mutants (`<` to `<=`, a
condition to `true`, a function body emptied, a string emptied), and
runs the unit tests with each one. A mutant is *killed* when a test
fails, and *survived* when every test still passes: then nothing checks
that piece of code closely enough. It covers `src/game/`, `src/save/` and
`src/levels/parse.ts`, the code the unit tests are for; not the level
list, the drawing, scenes or audio. It prints a table per file and writes
`reports/mutation/mutation.html`, which shows every surviving mutant in
its source line, to open in the Windows browser like the coverage
reports.

- Some survivors change nothing a player or the rules could notice
  (*equivalent* mutants, e.g. `<` to `<=` where the two values are never
  equal, or a check that only makes the solver faster). Look at each new
  survivor and either add a test or leave it. The ones known to be
  equivalent are listed in `docs/ROADMAP.md` (*Mutation testing*), so a
  later run shows what is new.
- It runs `npx vitest run src` once per mutant (Stryker's *command
  runner*), 8 at a time with 3 Vitest workers each. Stryker's own Vitest
  runner doesn't work with Vitest 5: its mutants never switch on, so
  nearly all of them "survive". Running more at once overloads the
  processor and runs time out, which Stryker counts as killed. Its
  incremental mode can't see which tests changed with this runner, so
  each run is a full one.
- About 6 minutes, using every processor core: run it in the background,
  and not while committing. Never part of `npm run build` or the commit
  checks.

The smoke tests (`e2e/`) build the game into `dist-e2e/` (leaving `dist/`
alone) with the same layout as `dist/` for the website, serve it with
`vite preview` and play it in headless Chromium through the main page,
as players do: the main page loading everything from its version folder
(and that folder's own page working, as an older snapshot's does), the
title screen and level list, completing levels with the mouse, keyboard and
touch, restart, the player's mirror, both skips, progress kept after a
reload, the game with localStorage blocked, everything fitting on a
phone screen and after resizing the window or turning the phone
mid-level, bonus targets (hidden until par, collected, the star turning
golden), the once-per-player celebrations (*All levels at par*, *All
bonus targets found*) from seeded progress, *Reset progress*, the sound
settings kept after a reload and switched with M and F, Esc cancelling
the choice of the mirror's cell, the hidden skip by holding the level's
name, a skip given back after time on levels with none left, and
interrupting a shot in flight (restart, Menu/Esc, the
hidden skip, firing again), for which the test hook slows the game's
time so the pellet is surely still moving. Two tests
(`e2e/motion.e2e.ts`) play with motion on: a level with mirrors and a
breakable wall from the title and back (the title's beam, transitions,
the board's intro, sparks, glints and shake), and the finale. `npm run e2e:full` also plays every level through by its
shortest solution (`e2e/levels.e2e.ts`), which runs the drawing and effects of
every block type, and after every move the board must match the rules,
both as the level's state and as drawn (a mirror's direction read from
its rotation). Any console error or uncaught exception fails a test. They
find buttons, launchers and cells through a test hook (`src/testHook.ts`),
loaded only when the URL has `?e2e`, and play levels by the solver's
solutions. Apart from the motion tests they run with reduced motion,
which keeps them fast and steady, and at pixel density 1 on the
phone: the browser draws in software, and the phone's real density made it
too slow. Run `npm run e2e:full` before a release and after changes to
drawing, levels or block types; the quick set runs with each commit that
changes the game. A failure leaves a trace to open with
`npx playwright show-trace` (the path is printed).

**Browser tests as on GitHub.** GitHub's machines have no GPU and 4 slow
cores: the browsers draw in software at about 3 frames a second, and the
full set takes about 12 minutes instead of 4. Recording a trace makes
every step of a test about three times slower, so there only a failed
test's retry records one, and tests get longer time limits (`CI` set:
`playwright.config.ts`, `e2e/ci.ts`; a test file's own
`test.describe.configure` limit overrides the config's, so give it a
`CI` value too). Under `?e2e` the game's time keeps up with real time at
low frame rates (`ticker.minFPS` in `src/testHook.ts`); a test that needs
something done within a few seconds of the game's time slows the game
with `game.setSpeed()` instead of relying on speed. Two local cores
behave about like GitHub:

```bash
CI=1 taskset -c 0-1 npx playwright test --project=desktop --project=phone --project=levels --retries=0
```

About 11 minutes; every test must pass with time to spare (the slowest
took 1.2 min of their 2 min limit).

What is checked only by hand: how drawing, animation and sound look and
sound, and anything only a real phone shows (such as the GPU line bugs in
CLAUDE.md). Before committing a change that affects them, play it in
`npm run dev`: fire a few shots, restart, complete a level, and return to
the title screen.

### Seeing the game's ending by hand

The ending (the last bonus target found) and the title screen after it
happen once per player. To see them without playing every level, set the
saved progress in the browser console (F12 → Console) and reload: every
level at par and every bonus target found except level 1's.

```js
localStorage.setItem("diagonpuzzle.progress", JSON.stringify({
  version: 1,
  levels: {"first-light":{"bestShots":1},"up-and-over":{"bestShots":1},"second-try":{"bestShots":2},"set-the-stage":{"bestShots":2},"double-take":{"bestShots":2},"encore":{"bestShots":3},"down-and-around":{"bestShots":2},"third-time-lucky":{"bestShots":3},"back-and-forth":{"bestShots":3},"two-step":{"bestShots":4},"breakthrough":{"bestShots":3},"trapdoor":{"bestShots":4},"stone-by-stone":{"bestShots":4},"crack-and-double":{"bestShots":3},"rubble-run":{"bestShots":5},"your-move":{"bestShots":1},"hairpin":{"bestShots":2},"double-duty":{"bestShots":3},"clear-the-way":{"bestShots":3},"rebuild":{"bestShots":4},"return-trip":{"bestShots":1},"there-and-back":{"bestShots":2},"glass-house":{"bestShots":2},"clean-break":{"bestShots":3},"ricochet":{"bestShots":3},"mirror-image":{"bestShots":3},"double-back":{"bestShots":4},"glass-echo":{"bestShots":3},"double-glazing":{"bestShots":4},"glass-and-stone":{"bestShots":4},"bolted-down":{"bestShots":2},"cold-steel":{"bestShots":3},"strike-twice":{"bestShots":4},"steel-echo":{"bestShots":3},"true-north":{"bestShots":3},"other-side":{"bestShots":1},"shortcut":{"bestShots":2},"knock-first":{"bestShots":3},"boomerang":{"bestShots":4},"looking-glass":{"bestShots":4}},
  skipped: [],
  bonuses: {"up-and-over":[0],"second-try":[0],"set-the-stage":[0],"double-take":[0],"encore":[0],"down-and-around":[0],"third-time-lucky":[0],"back-and-forth":[0],"two-step":[0],"breakthrough":[0],"trapdoor":[0],"stone-by-stone":[0],"crack-and-double":[0],"rubble-run":[0],"your-move":[0],"hairpin":[0],"double-duty":[0],"clear-the-way":[0],"rebuild":[0],"return-trip":[0],"there-and-back":[0],"glass-house":[0],"clean-break":[0],"ricochet":[0],"mirror-image":[0],"double-back":[0],"glass-echo":[0],"double-glazing":[0],"glass-and-stone":[0],"bolted-down":[0],"cold-steel":[0],"strike-twice":[0],"steel-echo":[0],"true-north":[0],"other-side":[0],"shortcut":[0],"knock-first":[0],"boomerang":[0],"looking-glass":[0]},
  skipsLeft: 3,
  skipWaitMs: 0
}));
location.reload();
```

- **The ending:** open *1. First light* (its bonus target shows, as the
  level is at par) and fire from the top row, which hits it. Run the
  snippet again to see it once more.
- **The title screen afterwards** (ALL FOUND! and the prism crystal): add
  `"first-light":[0],` at the start of `bonuses` before running it.
- **Clearing it:** *Reset progress* on the title screen.
- On a phone, use remote debugging (`chrome://inspect` in desktop Chrome
  for Android).
- The snippet lists the 40 levels up to *Looking glass* by `id` and `minShots`
  (`src/levels/levels.ts`). Add new levels to both lists, or level 1's
  bonus target is not the last one left and the ending doesn't play. The
  `[0]` is each level's first bonus target, by its index in reading
  order.

## 3. Commit

```bash
git status                       # what changed
git diff                         # review the changes
git add -A
git commit -m "Short summary of the change"
```

- Work directly on `main`. Commit small, working steps.
- **Checks before each commit:** the `pre-commit` hook runs `npm run build`
  (lint, type check, tests, production build; about 5 seconds). When the
  commit changes the game (`src/`, `public/`, `e2e/`, `index.html`, the
  Vite or Playwright config, or `package.json` and its lock file), it also
  runs the quick browser smoke tests, `npm run e2e` (about 2 minutes); commits
  of only docs skip them. If Playwright's Chromium isn't installed, the
  hook warns and skips them. If anything fails, the commit is stopped and
  the errors are shown; fix them and commit again. Merge commits are
  checked the same way.
- **Nothing private in commits:** the repository is public on GitHub, so
  before the checks the hook stops a commit that adds lines looking
  private, and lists them: paths on this machine outside the repository
  (Windows drives under `/mnt/`, `\\wsl.localhost\…`, `C:\…`,
  `/home/…`, install folders in *Program Files*) and keys, tokens or
  passwords (`.githooks/private-lines`; the same check warns in
  `npm run github`). Write a placeholder instead
  (`<backup repo>`, `\\wsl.localhost\<distro>\…`) or a command that finds
  the path (`git remote get-url backup`, `wslpath -w`), and keep the real
  value in `docs/backup.local.md`, which is git-ignored. Generic places
  pass: `~/.nvm/`, `/tmp`, `/mnt/c` as an example. If a listed line is
  fine to publish, allow it for that one commit:
  `ALLOW_PRIVATE_LINES=1 git commit …`.
- The checks run on the files in the working tree. If some changes are not
  staged for the commit, the hook prints a note, since the checked files then
  differ from the commit. With `git add -A` they are the same.
- To commit without the checks, e.g. to save unfinished work, use
  `git commit --no-verify`. The commit still gets a version tag.
- Use a branch only for experiments you may throw away:
  ```bash
  git switch -c try-something    # experiment
  git switch main                # abandon (git branch -D try-something)
  git merge try-something        # or keep it
  ```
- Update `docs/ROADMAP.md` checkboxes and `docs/DESIGN.md` in the same commit
  as the change they describe.
- Each commit on `main` is tagged with the next version, pushed to the
  backup and built into `dist/` automatically; git prints e.g. `Tagged
  v0.6.`, `Pushed to backup.` and `Built dist/v0.6/ and dist/index.html, ready
  to upload.`
  See *Versions*, *4. Back up* and *5. Release to the website* below.

## Versions

Every commit on `main` gets a version tag, `vMAJOR.MINOR`, from the
`post-commit` and `post-merge` hooks in `.githooks/`:

- Each commit increases the minor version: v0.9 → v0.10 → v0.11. Versions
  compare as numbers, so v0.10 is newer than v0.9.
- To start a new major version, run this **before** the commit that should
  get it:
  ```bash
  npm run version:major          # the next commit on main becomes v1.0
  ```
  The minor version restarts at 0, and later commits continue v1.1, v1.2, ….
  The setting is used once and then cleared.
- Merging an experiment branch into `main` tags the result like a commit.
  Commits on other branches are not tagged.
- `git commit --amend` moves the tag to the amended commit instead of using a
  new version. If the commit was already pushed, see "Amending a pushed
  commit" in section 4.
- Rebasing does not tag anything, and existing tags stay on the old commits.
  Avoid rewriting history on `main`.
- `git describe --tags` shows the version of the current commit.

The hooks are enabled by `npm install` (its `prepare` script sets
`core.hooksPath` to `.githooks`, and `push.followTags` so that `git push`
also sends new tags). To enable them manually: `npm run prepare`.

Tags v0.1–v0.4 were created by hand before this, as lightweight tags, which
`git push` does not send automatically. Push them to the backup once with
`git push backup --tags`.

## 4. Back up

Each commit on `main` is pushed to the backup automatically, right after it
is tagged (the `post-commit` and `post-merge` hooks run
`.githooks/push-backup`). The `backup` remote is a bare repository on another
disk (`git remote get-url backup` shows where). Version tags are pushed
along with the commits. Commits on other branches are not pushed.

GitHub is never updated automatically: commits go there only with
`npm run github` (see *Release on GitHub Pages*), so a commit made by
mistake, with something private in it, can still be fixed before it is
public.

The automatic push never forces and never stops a commit. If it can't push,
it prints a warning starting with `⚠ Backup not updated` and the commit
stays local:

- **Disk not available** (the backup disk not connected or not mounted):
  push later with `git push backup`, or just make the next commit once the
  disk is back.
- **Push rejected**: the backup has a commit that local `main` doesn't, which
  happens after amending a pushed commit (see below). Every later commit
  repeats the warning until this is fixed.

`git status` shows how many commits are not yet pushed ("ahead N").

To turn the automatic push off, for example when working without the backup
disk for a while: `git config diagonpuzzle.autoPush false` (back on with
`git config --unset diagonpuzzle.autoPush`). Then push by hand at the end of
every work session with `git push backup`.

### Amending a pushed commit

Prefer to amend only commits that are not pushed yet. After amending a pushed
commit, the backup still has the old commit and the old tag position, and
the automatic push is rejected. Replace them in the backup by hand, naming
the moved tag:

```bash
git push --force backup main vX.Y
```

If it was already put on GitHub, it is public: amending there needs
`git push --force github main vX.Y` too, and others may already have the
old commit. Don't do this for a version already released on GitHub Pages:
its Release and site folder stay as they were built.

### Checking the backup

```bash
# 1. Nothing unpushed: shows "## main...backup/main" without [ahead N].
git fetch backup && git status -sb

# 2. All branches and tags match the backup: no output.
diff <(git for-each-ref --format='%(objectname) %(refname)' refs/heads refs/tags | sort) \
     <(git ls-remote --heads --tags backup | grep -v '\^{}' | awk '{print $1, $2}' | sort)

# 3. The backup's files are intact: no output.
git -C "$(git remote get-url backup)" fsck --full
```

Now and then, test a real restore: clone the backup into a temporary folder
and build it.

```bash
git clone "$(git remote get-url backup)" /tmp/restore-test
cd /tmp/restore-test && npm ci && npm run build
cd ~ && rm -rf /tmp/restore-test
```

The backup doesn't include uncommitted work, stashes, local git settings
(`.git/config`) or git-ignored files.

## 5. Release to the website

The game is released in one of two ways: on GitHub Pages, by publishing a
GitHub Release for a version (*Release on GitHub Pages* below), or by
uploading `dist/` to a web host by hand (the steps here).

1. Commit everything. After each commit on `main`, the `post-commit` hook
   rebuilds `dist/` with the new version (`.githooks/build-release`), and
   git prints `Built dist/v0.6/ and dist/index.html, ready to upload.`
   That build only runs the production build: the checks already passed
   before the commit.

   If git printed `dist/ not rebuilt` instead, build by hand from a clean
   tree. The build runs every check and stops before creating `dist/` if
   one fails.
   ```bash
   git status                   # must show no changes
   npm run build
   ```
   It is skipped, with that note, when there are uncommitted changes (the
   version would end in "-dirty"), when the checks didn't run for the
   commit (`--no-verify`, or a fast-forward merge), or if the build fails
   (the errors are shown). The pre-commit check's own build doesn't count:
   it ran before the commit had its version tag, so it shows the previous
   version as "-dirty" (see below). Turn the automatic build off with
   `git config diagonpuzzle.autoBuild false`.
2. Optionally test the built version locally, as the site's main page:
   ```bash
   npx vite preview             # http://localhost:4173
   ```
   (Opening `dist/index.html` directly from disk does not work: browsers block
   module scripts loaded from `file://`.)
3. Upload with WinSCP. In the local pane, open the path that
   `wslpath -w dist` prints (`explorer.exe dist` shows the folder too).
   It holds exactly what to upload:
   ```
   dist/
     index.html     the site's main page: plays the version below
     v0.6/          the whole game of this version
   ```
   - Upload the version folder (`v0.6/`) into the game's folder on the
     server (`diagonpuzzle/`), next to the older versions.
   - **Then** upload `index.html` over the old one in `diagonpuzzle/`.
     `diagonpuzzle/` now plays v0.6, and `diagonpuzzle/v0.6/` plays it too.
   - Older version folders stay as they are, so each one keeps playing
     its version at its own address (`diagonpuzzle/v1.10/`). Delete the
     ones not worth keeping as snapshots, but never the one the main page
     points to. Don't use WinSCP's *Synchronize* with "delete files" on
     `diagonpuzzle/`: it would delete every older version.
   - The main page is a copy of the version's own page with a
     `<base href="./v0.6/">` tag, which loads everything else from the
     version folder. The address bar stays at `diagonpuzzle/`. A browser
     still showing a cached older main page plays the older version,
     which is still there, until it reloads.
   - All versions on the same site share one saved progress (browser
     storage is per site, not per folder).
4. Open the site and play through a level to confirm it works. If the page is
   blank, check the browser's developer tools (F12): 404 errors mean files are
   missing or in the wrong folder.
5. **Check on a phone.** Phone browsers differ from desktop ones in ways
   desktop testing doesn't show: phone GPUs draw some shapes differently (an
   earlier bug drew stray lines only on phones), and touch replaces the mouse
   and keyboard. On the phone, open the site and check:
   - the version on the title screen is the new one (if not, reload: the
     browser may still have the old version cached);
   - the title screen and buttons look right, with no stray lines or
     misplaced shapes;
   - a few shots on a level look right while the beam moves and when it
     ends, and mirrors flip;
   - touch works: tapping an emitter fires, buttons respond, and anything
     changed in this release that uses touch (gestures, new buttons).

The game works from any folder on the host (`base: "./"` in
`vite.config.ts`). The version folder and the main page are made by the
`versionFolder` plugin there, for any build: `dist/`, and the smoke
tests' `dist-e2e/`, which so check the layout that gets uploaded. It
clears that folder first, and refuses an `--outDir` that isn't a folder
inside the project.

### Release on GitHub Pages

Commits and their version tags go to GitHub only when you choose, with
`npm run github`, and only the versions chosen for players are put online:
publishing a GitHub Release for a version tag starts the workflow
in `.github/workflows/pages.yml`. On GitHub's machines it runs every check
(`npm run build`) and the full browser set (`npm run e2e:full`, every level
played through), and only if all pass adds the version folder and the main
page to the `gh-pages` branch, the same layout as an upload above: older
version folders stay as snapshots.

- Repository: https://github.com/eisiishai/diagonpuzzle (public)
- Site: https://eisiishai.github.io/diagonpuzzle/ (first release v2.13,
  2026-10-16)

**Login without a token in WSL.** Git signs in to GitHub through Git
Credential Manager from Git for Windows, which keeps the login in the
Windows Credential Manager, encrypted with the Windows login. The GitHub
CLI (`gh`) is not logged in: in WSL it can only keep its token in a plain
text file (`~/.config/gh/hosts.yml`), with write access to every
repository. Repository settings and Releases are done on github.com.

**Setup on a machine** (the repository and Pages already exist). The
credential helper is `git-credential-manager.exe` in Git for Windows'
`mingw64/bin` folder, given as a WSL path with its spaces escaped
(`docs/backup.local.md`, git-ignored, has the exact command):

```bash
git config --global credential.helper "<git-credential-manager.exe>"
git remote add github https://github.com/eisiishai/diagonpuzzle.git
git fetch github                 # the first push opens a Windows sign-in
```

How it was set up the first time: the repository was created empty on
github.com (no README, license or .gitignore), `npm run github` pushed all
history and versions, *Actions → Release to GitHub Pages → Run workflow*
made the first release, and then *Settings → Pages* was set to *Deploy
from a branch*, branch `gh-pages`, folder `/ (root)`.

**Each release:**

1. Commit as usual; the hook pushes only to the backup.
2. Put the commits on GitHub:
   ```bash
   npm run github
   ```
   It lists the commits, changed files and tags GitHub doesn't have yet,
   warns about added lines that look private (local paths, home folders,
   keys, tokens), and pushes only after you answer `y`. It never forces.
   Check the list: whatever is pushed is public. If a commit has something
   private in it, answer `n` and fix it first (*Amending a pushed commit*
   for the last commit; an older one needs its history rewritten, so ask
   for help). `npm run github` can also be run any time without releasing:
   pushing releases nothing.
3. Publish a Release for that version's existing tag: on github.com,
   *Releases → Draft a new release*, choose the tag (`v2.14`) from the
   list, give a title and what changed, *Publish release*. Never type a
   new tag name there: GitHub would create that tag by hand on the
   current `main`, outside the hooks' numbering. A Release marked as a
   pre-release isn't put online. (With `gh` logged in for the moment,
   `gh release create v2.14 --verify-tag --title v2.14 --notes "…"` does
   the same; `gh auth logout` afterwards.)
4. Follow the run under *Actions*; it takes about 15 minutes. If a check fails,
   nothing goes online. On GitHub a failed browser test runs once more,
   recording a trace (recording one for every test slows GitHub's 4 cores
   until tests time out); the traces are in the run's `e2e-results`
   artifact (`npx playwright show-trace`). A test that passed only on its
   second run is listed as flaky and doesn't stop the release. Fix,
   commit, and release the new version. Before that, check a fix to
   the browser tests as on GitHub (*Browser tests as on GitHub* in
   *2. Check*).
5. Open the site and check it as in steps 4 and 5 above, phone included.

To run a release again, or to point the main page back at an earlier
version, use *Run workflow* with that version: the main page plays the
version released last.

### Which version is online

The title screen shows the version the game was built from, so opening the
website shows which version is online. It comes from `git describe --tags`
at build time (`vite.config.ts`):

| Shown | Meaning |
|---|---|
| `v0.9` | Built from the commit tagged v0.9, with no uncommitted changes: a proper release. |
| `v0.8-dirty` | Built with uncommitted changes. Not a release; don't upload it. |
| `v0.8-2-g1a2b3c4` | Built from a commit 2 commits after v0.8 (e.g. on a branch). |

`git describe --tags` in the terminal shows the same value for the current
working tree.

## Possible additions

Not set up, and not needed at the current size:

- **`npm run deploy`** uploading `dist/` from WSL to a web host (e.g. with
  `rsync` or `lftp`), if releases there become frequent. Depends on what
  the host supports. (GitHub Pages needs none: see *Release on GitHub
  Pages*.)
