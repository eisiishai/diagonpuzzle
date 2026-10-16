# diagonpuzzle

Turn-based grid puzzle game: the player fires a pellet into a grid, diagonal
mirrors (`\` `/`) turn it 90°, and the goal is to make it reach a target cell.
Built with PixiJS 8 + Vite + TypeScript (plain PixiJS, no React).

- Game design and rules: `docs/DESIGN.md`
- Milestones and current status: `docs/ROADMAP.md` (the only place status is tracked)
- Develop / check / commit / back up / release steps: `docs/WORKFLOW.md`

## Commands

- `npm run dev` — dev server on http://localhost:8080
- `npm run build` — lint + type-check + tests + production build (use this to
  verify changes)
- `npm run lint` — ESLint (with Prettier formatting rules)
- `npm test` — Vitest unit tests
- `npm run coverage` — the unit tests with code coverage: a table of files
  with uncovered code, and a line-by-line report in `coverage/index.html`
  (git-ignored)
- `npm run levels` — level design report: shortest solution, an
  alternative solution above par, setup routes,
  difficulty (random play's odds of finishing at par, and foresight: the
  changes the par solution makes for its later shots) and first-shot
  outcomes for every level, then the difficulty curve (`scripts/levels.ts`,
  runs with tsx)
- `npm run generate -- [options]` — searches random boards for new levels
  with a given par, best (unique shortest solution) first, only those with
  an alternative solution within par + 2, printed ready to paste into
  `levels.ts`; `--help` lists the options
- `npm run bonus -- --level N [options]` — finds cells for a level's bonus
  target `*` that take the wanted number of shots, optionally after small
  board changes that keep par and the pieces the level needs for it and
  leave the par route's cells alone, and
  (`--uses reflector,glass`) only with routes through given pieces;
  `--help` lists the options
- `npm run trace -- --level N MOVES...` — plays rows (and `x,y` for the
  player's mirror) on a level or a `--grid` and prints each shot's cells
  and the board after it, to check a route by hand
- `npm run alternatives -- [options]` — the different solutions of each
  level at par and a shot or two above it; with `--level N --changes 1`,
  board changes that add alternatives while keeping par, the par
  solution, the pieces the level needs and the bonus target; `--help`
  lists the options
- `npm run e2e` — quick browser smoke tests (Playwright, headless
  Chromium, `e2e/`): every screen and flow at desktop and phone size,
  about 2 minutes. The pre-commit hook runs it when a commit changes the game
- `npm run e2e:full` — the quick set plus every level played through,
  about 3½ minutes. Run before a release and after changes to drawing,
  levels or block types
- `npm run mutation` — mutation testing (Stryker) of the rules
  (`src/game/`, `src/save/`, `src/levels/parse.ts`): small changes to the
  code that some unit test should notice; report in
  `reports/mutation/mutation.html` (git-ignored). Slow; run by hand now and
  then, in the background
- `npm run e2e:coverage` — the full browser set with code coverage of the
  game in the browser: a table of files with uncovered code, and a
  line-by-line report in `coverage-e2e/index.html` (git-ignored). About
  4 minutes; run now and then, not with each commit
- `npm run screenshots` — pictures of the main screens in `screenshots/`
  (git-ignored). Look at them after a visual change; they don't show
  phone-only GPU bugs, so phone checks stay
- `npm run solutions` — writes `docs/solutions.local.md` (git-ignored, also
  run by `npm run build`): every level's grid and solution, for the user to
  look up. Don't commit or publish it.
- `npm run version:major` — make the next commit on main start a new major
  version (only when the user asks for a major version bump)
- `npm run github` — put `main` and its version tags on GitHub, after
  showing what GitHub doesn't have yet (with warnings for added lines
  that look private) and asking; the commit hook never pushes to GitHub.
  It makes commits public, so only when the user asks
- Deploy on GitHub Pages (https://eisiishai.github.io/diagonpuzzle/,
  repository github.com/eisiishai/diagonpuzzle): commit, `npm run github`,
  then the user publishes a GitHub Release for that existing tag on
  github.com (`gh` is kept logged out: in WSL it stores its token in plain
  text; git signs in through Git Credential Manager);
  `.github/workflows/pages.yml` runs `npm run build` and
  `npm run e2e:full` and only then adds the version folder and main page
  to the `gh-pages` branch. Not every version is released: the user
  chooses which. Publishing a Release is outward-facing, so only when the
  user asks. GitHub's machines are much slower than local runs: check
  browser test changes with
  `CI=1 taskset -c 0-1 npx playwright test --project=desktop --project=phone --project=levels --retries=0`
  (`docs/WORKFLOW.md`, *Browser tests as on GitHub*).
- Deploy to a web host by hand: commit (the `post-commit` hook rebuilds
  `dist/` with the new version; if it says "dist/ not rebuilt", run
  `npm run build` from a clean working tree), then upload `dist/`'s
  version folder (`dist/v1.16/`) as a new folder on the web host and
  `dist/index.html` over the old one there, which makes the site's main
  address play that version; older version folders stay online as
  snapshots (details in `docs/WORKFLOW.md`).
  The build embeds `git describe --tags` as the version shown on the title
  screen; a build with uncommitted changes shows "-dirty".

## Code structure

```
src/
  main.ts       PixiJS bootstrap, starts the first scene
  game/         game rules: types, board, cell behaviors, pellet simulation,
                solver (fewest shots for a level), LevelSession (state of a
                level being played), MirrorPlacement (choosing the player
                mirror's cell by mouse, touch or keyboard)
  levels/       level list (levels.ts, text grids) and the parser
  render/       PixiJS views and animations
  input/        mouse/keyboard → game actions
  audio/        synthesized sound (Web Audio): synth.ts building blocks,
                effects.ts, music.ts tracks, GameAudio.ts mixing and playback
  save/         saved progress: pure rules (progress.ts), GameProgress (the
                game's progress and how play changes it, tested) and
                localStorage helpers
  scenes/       TitleScene and GameScene; main.ts switches between them
  testHook.ts   the smoke tests' view of the game (scene, buttons, level
                state with screen positions, level list, celebration
                banner) and control of the game's speed, loaded only
                with ?e2e
scripts/        development tools run with tsx (not part of the game)
e2e/            browser smoke tests (Playwright) and their helpers
```

## Conventions

- `src/game/` and `src/levels/` must never import `pixi.js`. They are pure
  TypeScript so rules can be tested and reused (e.g. level solvability checks).
- The simulation computes the pellet's full path and outcome up front; the
  renderer only animates that result.
- Scenes hold no game rules: a level's state and what the player may do live
  in `LevelSession` (tested); `GameScene` calls it and displays the result.
  Likewise `main.ts` holds no progress rules: what completions, bonus
  targets, skips and level time change lives in `GameProgress` (tested);
  `main.ts` builds scenes and saves.
- Each cell type defines its behavior as "pellet enters moving in direction D →
  result". New block types are added there, not as special cases in the
  simulation loop; `docs/WORKFLOW.md` lists everything else a block type
  touches.
- Formatting follows Prettier via ESLint; keep `npm run lint` clean.
- Visual style follows the "Laser lab" art direction in `docs/DESIGN.md`.
  Colours, fonts, text styles and glow filters come only from
  `src/render/theme.ts`; buttons use `Button` from `src/render/ui.ts`.
- Stroked lines must never contain two identical points in a row, and don't
  use `Graphics.arc()`: some phone GPUs draw the resulting invalid points as
  stray lines to the screen's corner (desktop browsers hide this). Build
  curves with `arcPoints()` and clean point lists with `distinctPoints()`
  from `src/render/polyline.ts`.
- The game may be hosted in a subfolder (`base: "./"` in `vite.config.ts`),
  and the site's main page plays it from its version folder through a
  `<base>` tag. Refer to files in `public/` with relative paths
  (`assets/x.png`), never root paths (`/assets/x.png`).
- Level `id`s are used as keys in saved progress: never change or reuse one
  once released. Since v1.0 players have real saves, so released levels'
  `minShots` and boards are best left alone too: stars are worked out
  from the saved best shots against the current `minShots`, and bonus
  targets are saved by their index in reading order. Add a new level
  rather than change a released one.
- Saved progress must keep loading: `parseProgress` gives empty progress
  for any other `FORMAT_VERSION`, so add new fields as optional with a
  default (as `skipped`, `bonuses` and `skipsLeft` were) instead of
  bumping the version, or convert old saves first.
- Access localStorage only through `src/save/storage.ts`, which tolerates
  storage being unavailable.
- Shots change the board (mirrors flip when hit): `fire()` returns the new
  board and never modifies the one passed in.
- Every level declares `minShots` (and `goalHits` when the goal needs more
  than one hit, `bonusShots` when it has a bonus target `*`);
  `src/levels/levels.test.ts` checks them with the solver.
  Design new levels with `npm run generate`, then hand-tune the board and
  confirm it with `npm run levels`. Every level needs an alternative
  solution within par + 2 shots (tests check it), so a player who strays
  from par can still finish.
- Level design scripts (searches, generators, placement helpers) go in
  `scripts/` and are committed with the work that uses them, as an npm
  script with `--help` and tests for the search logic. Don't leave them as
  throwaway files in a scratch folder; they are needed again in later
  sessions. Searches over moves build on the solver's shared pieces
  (`eachCompletion`, `mirrorPlacements`, `tryPlayMoves`, `completesLevel`
  in `src/game/solver.ts`) and board edits on `withCell(s)` in
  `src/game/board.ts`, rather than their own copies, so a new kind of move
  is added in one place.
- Update `docs/ROADMAP.md` checkboxes when a task is completed, and
  `docs/DESIGN.md` when a rule changes.
- Every commit runs `npm run build` first (pre-commit hook), plus
  `npm run e2e` when it changes `src/`, `public/`, `e2e/`, the build
  config or dependencies, and is stopped if either fails: fix the problem rather than bypassing it. Use `--no-verify` only
  when the user asks for it.
- Every commit on `main` is tagged with the next version (`vMAJOR.MINOR`) by
  the git hooks in `.githooks/`. Don't create version tags by hand, and don't
  rewrite history on `main` (rebase), which leaves tags on the old commits.
- The `post-commit` hook then pushes `main` and its tags to the `backup`
  remote (never forced; it only warns if that fails; GitHub only with
  `npm run github`), and rebuilds `dist/`
  with the new version. Don't push or force-push by hand unless the user
  asks.

## Environment

WSL Ubuntu, Node via nvm (Linux side, not Windows npm). Keep the project on the
Linux filesystem. The user installs tools and packages themselves — suggest
install commands rather than running them.
