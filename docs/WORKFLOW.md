# Workflow

How to develop, check, commit, back up and release the game. Every step is a
command run by hand; nothing runs automatically.

## Setup on a new machine

Requirements: WSL Ubuntu (or Linux), Node.js installed on the Linux side with
nvm, not Windows' Node. Check with `which node npm`: both should be under
`~/.nvm/`.

```bash
git clone <backup repo> diagonpuzzle
cd diagonpuzzle
npm install          # also enables the git hooks (see Versions)
npm run build        # confirms everything works
```

Keep the project on the Linux filesystem (e.g. `~/claude/diagonpuzzle`), not
under `/mnt/c` or another Windows drive: it is much faster there, and Vite's
file watching works reliably.

## 1. Develop

```bash
npm run dev          # dev server at http://localhost:8080, reloads on save
```

- Open the URL in the Windows browser; WSL forwards `localhost`.
- When designing or changing levels, run `npm run levels`. It reports each
  level's shortest solution, two-shot setup routes and what each row's first
  shot does, and marks with ✗ any level whose declared `minShots` doesn't match
  the solver.

## 2. Check

| Command | Checks |
|---|---|
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint and Prettier formatting |
| `npm run build` | Lint, TypeScript type check, unit tests, then builds `dist/`. Stops at the first failure. |

`npm run build` is the full check: run it before committing.

What the tests cover: game rules, simulation, solver, `LevelSession`, level
parser, saved progress and path geometry. Every level is checked against its
declared `minShots` with the solver, and levels 1–2 must keep their two-shot
setup route.

What is checked only by hand: drawing, animation, sound, input and layout.
Before committing a change that affects them, play it in `npm run dev`:
fire a few shots, restart (also while the pellet is moving), complete a level,
and return to the title screen.

## 3. Commit

```bash
git status                       # what changed
git diff                         # review the changes
git add -A
git commit -m "Short summary of the change"
```

- Work directly on `main`. Commit small, working steps: each commit should
  pass `npm run build`.
- Use a branch only for experiments you may throw away:
  ```bash
  git switch -c try-something    # experiment
  git switch main                # abandon (git branch -D try-something)
  git merge try-something        # or keep it
  ```
- Update `docs/ROADMAP.md` checkboxes and `docs/DESIGN.md` in the same commit
  as the change they describe.
- Each commit on `main` is tagged with the next version automatically; git
  prints e.g. `Tagged v0.6.` See *Versions* below.

## Versions

Every commit on `main` gets a version tag, `vMAJOR.MINOR`, from the git hooks
in `.githooks/`:

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
  new version. If that tag was already pushed, update the backup with
  `git push --force backup vX.Y`.
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

```bash
git push                         # to the backup remote
```

The `backup` remote is a bare repository on another disk:
`<backup repo>`. Only pushed commits are backed
up; push at the end of every work session. `git status` shows how many commits
are not yet pushed ("ahead N"). Version tags are pushed along with the
commits.

## 5. Release to the website

1. Build. The build runs every check and stops before creating `dist/` if one
   fails.
   ```bash
   npm run build
   ```
2. Optionally test the built version locally:
   ```bash
   npx vite preview             # http://localhost:4173
   ```
   (Opening `dist/index.html` directly from disk does not work: browsers block
   module scripts loaded from `file://`.)
3. Upload the **contents** of `dist/` with WinSCP. In the local pane, open
   `\\wsl.localhost\<distro>\home\<user>\…\diagonpuzzle\dist`.
   - Upload `assets/` before `index.html`, so the new page never points to
     files that aren't there yet.
   - Then delete the old `.js` files from `assets/` on the server. Each build
     gives them new names. WinSCP's *Synchronize* with "delete files" does the
     upload and the cleanup in one step.
4. Open the site and play through a level to confirm it works. If the page is
   blank, check the browser's developer tools (F12): 404 errors mean files are
   missing or in the wrong folder.

The game works from any folder on the host (`base: "./"` in
`vite.config.ts`).

### Which version is online

The release is the version of the commit you built: check it with
`git describe --tags` before uploading, and only upload from a clean working
tree (`git status` shows no changes), so the build matches the tagged commit.

## Possible additions

Not set up, and not needed at the current size:

- **Pre-commit hook** running `npm test` automatically before each commit
  (the `.githooks/` folder is already in place for it).
- **Version shown in the game**, e.g. on the title screen, from
  `git describe --tags` at build time.
- **`npm run deploy`** uploading `dist/` from WSL (e.g. with `rsync` or
  `lftp`), if releases become frequent. Depends on what the host supports.
- **Browser smoke tests** (e.g. Playwright), if manual checks of the screens
  become a burden.
