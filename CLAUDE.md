# diagonpuzzle

Turn-based grid puzzle game: the player fires a pellet into a grid, diagonal
mirrors (`\` `/`) turn it 90°, and the goal is to make it reach a target cell.
Built with PixiJS 8 + Vite + TypeScript (plain PixiJS, no React).

- Game design and rules: `docs/DESIGN.md`
- Milestones and current status: `docs/ROADMAP.md` (the only place status is tracked)
- Detailed feature specs, when needed: `docs/features/`
- Develop / check / commit / back up / release steps: `docs/WORKFLOW.md`

## Commands

- `npm run dev` — dev server on http://localhost:8080
- `npm run build` — lint + type-check + tests + production build (use this to
  verify changes)
- `npm run lint` — ESLint (with Prettier formatting rules)
- `npm test` — Vitest unit tests
- `npm run levels` — level design report: shortest solution, setup routes and
  first-shot outcomes for every level (`scripts/levels.ts`, runs with tsx)
- `npm run solutions` — writes `docs/solutions.local.md` (git-ignored, also
  run by `npm run build`): every level's grid and solution, for the user to
  look up. Don't commit or publish it.
- `npm run version:major` — make the next commit on main start a new major
  version (only when the user asks for a major version bump)
- Deploy: commit, then `npm run build` from a clean working tree, then copy
  the contents of `dist/` to the web host (details in `docs/WORKFLOW.md`).
  The build embeds `git describe --tags` as the version shown on the title
  screen; a build with uncommitted changes shows "-dirty".

## Code structure

```
src/
  main.ts       PixiJS bootstrap, starts the first scene
  game/         game rules: types, board, cell behaviors, pellet simulation,
                solver (fewest shots for a level), LevelSession (state of a
                level being played)
  levels/       level list (levels.ts, text grids) and the parser
  render/       PixiJS views and animations
  input/        mouse/keyboard → game actions
  audio/        synthesized sound (Web Audio): synth.ts building blocks,
                effects.ts, music.ts tracks, GameAudio.ts mixing and playback
  save/         saved progress (pure rules) and localStorage helpers
  scenes/       TitleScene and GameScene; main.ts switches between them
scripts/        development tools run with tsx (not part of the game)
```

## Conventions

- `src/game/` and `src/levels/` must never import `pixi.js`. They are pure
  TypeScript so rules can be tested and reused (e.g. level solvability checks).
- The simulation computes the pellet's full path and outcome up front; the
  renderer only animates that result.
- Scenes hold no game rules: a level's state and what the player may do live
  in `LevelSession` (tested); `GameScene` calls it and displays the result.
- Each cell type defines its behavior as "pellet enters moving in direction D →
  result". New block types are added there, not as special cases in the
  simulation loop.
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
  once released.
- Access localStorage only through `src/save/storage.ts`, which tolerates
  storage being unavailable.
- Shots change the board (mirrors flip when hit): `fire()` returns the new
  board and never modifies the one passed in.
- Every level declares `minShots` (and `goalHits` when the goal needs more
  than one hit); `src/levels/levels.test.ts` checks it with the solver. When designing a level, run the solver to confirm the intended
  minimum and that no shorter solution exists.
- Update `docs/ROADMAP.md` checkboxes when a task is completed, and
  `docs/DESIGN.md` when a rule changes.
- Every commit runs `npm run build` first (pre-commit hook) and is stopped if
  it fails: fix the problem rather than bypassing it. Use `--no-verify` only
  when the user asks for it.
- Every commit on `main` is tagged with the next version (`vMAJOR.MINOR`) by
  the git hooks in `.githooks/`. Don't create version tags by hand, and don't
  rewrite history on `main` (rebase), which leaves tags on the old commits.

## Environment

WSL Ubuntu, Node via nvm (Linux side, not Windows npm). Keep the project on the
Linux filesystem. The user installs tools and packages themselves — suggest
install commands rather than running them.
