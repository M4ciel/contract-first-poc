#!/usr/bin/env bash
# Clean-clone check: a fresh clone of the current commit must install, generate and pass its tests
# with nothing but what is committed. It proves that no generated file is committed and that the
# code generation is complete (nothing works only because of files left on a developer machine).
#
# It clones HEAD, so commit first: uncommitted changes are not part of the check.
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

echo "› Cloning $(git -C "$root" rev-parse --short HEAD) into a temporary directory"
git clone --quiet --no-local "$root" "$work/repo"
cd "$work/repo"

echo "› Checking that no generated file is committed"
if git ls-files | grep -E '(^|/)src/generated/|(^|/)artifacts/'; then
  echo "✖ Generated files are committed (listed above). Remove them and change the generator." >&2
  exit 1
fi

# A fresh workspace has no Nx cache; skipping it also ignores any shared cache configuration.
export NX_DAEMON=false NX_SKIP_NX_CACHE=true NX_NO_CLOUD=true

echo "› pnpm install"
pnpm install --frozen-lockfile
echo "› Generating code from the contracts"
pnpm nx run contracts:generate
echo "› Running every test"
pnpm nx run-many -t test

echo "› Checking that generation and tests leave the working tree clean"
if [ -n "$(git status --porcelain)" ]; then
  git status --short
  echo "✖ Files above are produced but not git-ignored." >&2
  exit 1
fi

echo "✔ Clean clone installs, generates and passes its tests."
