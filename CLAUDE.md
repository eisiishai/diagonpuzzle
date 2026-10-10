# diagonpuzzle

Turn-based grid puzzle game: the player fires a pellet into a grid, diagonal
mirrors (`\` `/`) turn it 90°, and the goal is to make it reach a target cell.
Built with PixiJS 8 + Vite + TypeScript (plain PixiJS, no React).

- Game design and rules: `docs/DESIGN.md`
- Milestones and current status: `docs/ROADMAP.md` (the only place status is tracked)
- Detailed feature specs, when needed: `docs/features/`

## Commands

- `npm run dev` — dev server on http://localhost:8080
- `npm run build` — lint + type-check + production build (use this to verify changes)
- `npm run lint` — ESLint (with Prettier formatting rules)
- `npm test` — Vitest unit tests
- Deploy: `npm run build`, then copy the contents of `dist/` to the web host

## Code structure

```
src/
  main.ts       PixiJS bootstrap, starts the first scene
  game/         game rules: types, board, cell behaviors, pellet simulation
  levels/       level list (levels.ts, text grids) and the parser
  render/       PixiJS views and animations
  input/        mouse/keyboard → game actions
  audio/        sound effects and music (synthesized placeholders, Web Audio)
  save/         saved progress (pure rules) and localStorage helpers
  scenes/       TitleScene and GameScene; main.ts switches between them
```

## Conventions

- `src/game/` and `src/levels/` must never import `pixi.js`. They are pure
  TypeScript so rules can be tested and reused (e.g. level solvability checks).
- The simulation computes the pellet's full path and outcome up front; the
  renderer only animates that result.
- Each cell type defines its behavior as "pellet enters moving in direction D →
  result". New block types are added there, not as special cases in the
  simulation loop.
- Formatting follows Prettier via ESLint; keep `npm run lint` clean.
- The game may be hosted in a subfolder (`base: "./"` in `vite.config.ts`).
  Refer to files in `public/` with relative paths (`assets/x.png`), never
  root paths (`/assets/x.png`).
- Level `id`s are used as keys in saved progress: never change or reuse one
  once released.
- Access localStorage only through `src/save/storage.ts`, which tolerates
  storage being unavailable.
- Every level must be solvable; `src/levels/levels.test.ts` checks this for
  all levels in `LEVELS`.
- Update `docs/ROADMAP.md` checkboxes when a task is completed, and
  `docs/DESIGN.md` when a rule changes.

## Environment

WSL Ubuntu, Node via nvm (Linux side, not Windows npm). Keep the project on the
Linux filesystem. The user installs tools and packages themselves — suggest
install commands rather than running them.
