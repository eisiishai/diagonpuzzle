#!/bin/sh
# npm run github: puts main and its version tags on GitHub, only when asked.
# Commits go to the backup with every commit, but to GitHub only with this:
# it shows the commits, files and tags GitHub doesn't have yet, warns about
# added lines that look like local paths or secrets, and pushes after a yes.
# Never forces. See docs/WORKFLOW.md, *Release on GitHub Pages*.

set -e
BRANCH=main
REMOTE=github

case "$1" in
  -h | --help)
    cat <<'EOF'
Usage: npm run github [-- --yes]

Pushes main and its version tags to the `github` remote, after showing the
commits, changed files and tags that GitHub doesn't have yet and asking for
confirmation. Lines added in those commits that look like local paths or
secrets are shown as warnings first.

  --yes    push without asking (the summary and warnings are still shown)
EOF
    exit 0
    ;;
  --yes | "") ;;
  *)
    echo "Unknown option: $1 (see npm run github -- --help)" >&2
    exit 1
    ;;
esac

if ! git remote get-url "$REMOTE" >/dev/null 2>&1; then
  echo "No '$REMOTE' remote is set up: see docs/WORKFLOW.md, *Release on GitHub Pages*." >&2
  exit 1
fi

# What GitHub has now; on the first push, nothing.
git fetch --quiet "$REMOTE"
if git rev-parse --verify --quiet "refs/remotes/$REMOTE/$BRANCH" >/dev/null; then
  base="$REMOTE/$BRANCH"
  range="$base..$BRANCH"
else
  base=""
  range="$BRANCH"
fi

if [ -n "$base" ] && ! git merge-base --is-ancestor "$base" "$BRANCH"; then
  echo "GitHub's $BRANCH has commits that local $BRANCH doesn't (an amended" >&2
  echo "commit?). Nothing pushed; see \"Amending\" in docs/WORKFLOW.md." >&2
  exit 1
fi

count=$(git rev-list --count "$range")
remote_tags=$(git ls-remote --tags "$REMOTE" | sed -n 's|.*refs/tags/\([^^]*\)$|\1|p')
new_tags=$(git tag --merged "$BRANCH" --sort=v:refname |
  while read -r tag; do
    echo "$remote_tags" | grep -qxF "$tag" || echo "$tag"
  done)

if [ "$count" -eq 0 ] && [ -z "$new_tags" ]; then
  echo "GitHub is up to date."
  exit 0
fi

echo "Commits not yet on GitHub ($count):"
git log --decorate-refs=refs/tags/ --format='  %h%d %s' "$range" | head -40
if [ "$count" -gt 40 ]; then echo "  ..."; fi
if [ -n "$base" ]; then
  echo
  echo "Files changed:"
  git diff --stat=100 "$base" "$BRANCH" | sed 's/^/ /'
fi
echo
echo "Tags: $(echo "$new_tags" | tr '\n' ' ')"

# Added lines that look private: local paths, home folders, keys and tokens
# (the same check as pre-commit, so normally none; one is let through only
# with ALLOW_PRIVATE_LINES=1).
if [ -n "$base" ]; then
  suspicious=$("$(git rev-parse --show-toplevel)/.githooks/private-lines" "$base" "$BRANCH" | head -20)
  if [ -n "$suspicious" ]; then
    echo
    echo "⚠ Added lines that may be private (check before pushing):"
    echo "$suspicious" | sed 's/^/  /'
  fi
fi

echo
if [ "$1" != "--yes" ]; then
  printf "Push these to GitHub? [y/N] "
  read -r answer
  case "$answer" in
    y | Y | yes) ;;
    *)
      echo "Nothing pushed."
      exit 0
      ;;
  esac
fi

git push --follow-tags "$REMOTE" "$BRANCH"
# Tags made by hand before the hooks (v0.1–v0.4) are lightweight, which
# --follow-tags leaves out.
if [ -n "$new_tags" ]; then
  git push --quiet "$REMOTE" $(echo "$new_tags" | sed 's|^|refs/tags/|')
fi
echo "GitHub updated. To put a version online: gh release create vX.Y --verify-tag"
