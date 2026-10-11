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
- `npm run levels` — level design report: shortest solution, an
  alternative solution above par, setup routes,
  difficulty (random play's odds of finishing at par) and first-shot
  outcomes for every level, then the difficulty curve (`scripts/levels.ts`,
  runs with tsx)
- `npm run generate -- [options]` — searches random boards for new levels
  with a given par, best (unique shortest solution) first, only those with
  an alternative solution within par + 2, printed ready to paste into
  `levels.ts`; `--help` lists the options
- `npm run bonus -- --level N [options]` — finds cells for a level's bonus
  target `*` that take the wanted number of shots, optionally after small
  board changes that keep par; `--help` lists the options
- `npm run alternatives -- [options]` — the different solutions of each
  level at par and a shot or two above it; with `--level N --changes 1`,
  board changes that add alternatives while keeping par, the par
  solution and the bonus target; `--help` lists the options
- `npm run e2e` — quick browser smoke tests (Playwright, headless
  Chromium, `e2e/`): every screen and flow at desktop and phone size,
  about 70 s. The pre-commit hook runs it when a commit changes the game
- `npm run e2e:full` — the quick set plus every level played through,
  about 2 minutes. Run before a release and after changes to drawing,
  levels or block types
- `npm run screenshots` — pictures of the main screens in `screenshots/`
  (git-ignored). Look at them after a visual change; they don't show
  phone-only GPU bugs, so phone checks stay
- `npm run solutions` — writes `docs/solutions.local.md` (git-ignored, also
  run by `npm run build`): every level's grid and solution, for the user to
  look up. Don't commit or publish it.
- `npm run version:major` — make the next commit on main start a new major
  version (only when the user asks for a major version bump)
- Deploy: commit (the `post-commit` hook rebuilds `dist/` with the new
  version; if it says "dist/ not rebuilt", run `npm run build` from a clean
  working tree), then copy the contents of `dist/` to the web host (details
  in `docs/WORKFLOW.md`).
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
- The game may be hosted in a subfolder (`base: "./"` in `vite.config.ts`).
  Refer to files in `public/` with relative paths (`assets/x.png`), never
  root paths (`/assets/x.png`).
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
  sessions.
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
  remote (never forced; it only warns if that fails) and rebuilds `dist/`
  with the new version. Don't push or force-push by hand unless the user
  asks.

## Environment

WSL Ubuntu, Node via nvm (Linux side, not Windows npm). Keep the project on the
Linux filesystem. The user installs tools and packages themselves — suggest
install commands rather than running them.
