# Diagon Puzzle

A turn-based puzzle game in the browser: fire a pellet into a grid, let
diagonal mirrors (`\` `/`) turn it 90°, and get it to the goal crystal. Every
mirror the pellet bounces off flips, so a shot that misses still changes the
board, and the puzzle is planning shots that set up the next ones.

**[Play it in the browser](https://eisiishai.github.io/diagonpuzzle/)**

- 45 levels in chapters, each introducing a new piece: the player's own
  mirror, breakable walls, reflectors, glass mirrors, fixed mirrors,
  portals and one-way gates
- Par and stars for the fewest shots, and a hidden bonus target in every
  level once it's solved at par; players who find them all have something
  more to discover
- Mouse, touch and keyboard controls; synthesized music and sound effects
- Progress is saved in the browser

Built with [PixiJS 8](https://pixijs.com/), TypeScript and Vite.

## Running it locally

Requires Node.js (version 24 is what the release builds use).

```bash
npm install
npm run dev          # http://localhost:8080
```

`npm run build` runs lint, type checks and unit tests, then builds the game
into `dist/`. `npm install` also turns on the project's git hooks, which run
these checks before each commit and tag each commit on `main` with a version.

## Troubleshooting

**The game is slow or choppy.** The game draws with the graphics card
(WebGL), so check that hardware acceleration is turned on in your browser:

- Chrome: *Settings → System → Use graphics acceleration when available*,
  then relaunch the browser
- Edge: *Settings → System and performance → Use graphics acceleration
  when available*, then restart the browser
- Firefox: *Settings → General → Performance*; untick *Use recommended
  performance settings* to see *Use hardware acceleration when available*
- Safari: always on

Without it, the browser draws everything on the processor, which is much
slower.

## Documentation

- [docs/DESIGN.md](docs/DESIGN.md) — rules, levels, controls, art direction
  and sound
- [docs/ROADMAP.md](docs/ROADMAP.md) — milestones and what's next
- [docs/WORKFLOW.md](docs/WORKFLOW.md) — developing, testing, versions and
  releases
- [CLAUDE.md](CLAUDE.md) — every command and the code structure in brief

## License

[MIT](LICENSE)
