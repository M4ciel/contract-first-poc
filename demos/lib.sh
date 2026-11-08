#!/usr/bin/env bash
# Shared helpers for the live demos. Each demo runs in a throwaway git worktree on a `demo/<name>`
# branch, so your working tree is never touched; the worktree and the branch are removed at the end
# (KEEP=1 keeps them to look around).
#
# Every demo asserts its expected outcome: when the behaviour it shows changes, the demo fails.
# DEMO_NO_PAUSE=1 (or a non-interactive shell) skips the "press enter" pauses.
set -euo pipefail

ROOT="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
export NX_DAEMON=false NX_NO_CLOUD=true NX_TUI=false FORCE_COLOR=0
failures=0

title() { printf '\n\033[1;36m━━ %s ━━\033[0m\n' "$*"; }
step() { printf '\n\033[1m▶ %s\033[0m\n' "$*"; }
say() { printf '  %s\n' "$*"; }
pause() {
  if [ "${DEMO_NO_PAUSE:-}" != 1 ] && [ -t 0 ]; then read -r -p '  ⏎ ' _; fi
}

# expect_success|expect_failure <description> <command...>: runs the command, shows its output
# (indented) and checks the outcome.
expect() {
  # Prefixed names: bash locals are visible to the functions a demo passes in as the command.
  local _wanted="$1" _description="$2" _status
  shift 2
  set +e
  "$@" 2>&1 | sed 's/^/    │ /'
  _status=${PIPESTATUS[0]}
  set -e
  if { [ "$_wanted" = success ] && [ "$_status" -eq 0 ]; } || { [ "$_wanted" = failure ] && [ "$_status" -ne 0 ]; }; then
    printf '  \033[32m✔ %s\033[0m\n' "$_description"
  else
    printf '  \033[31m✖ %s (expected %s, exit %s)\033[0m\n' "$_description" "$_wanted" "$_status"
    failures=$((failures + 1))
  fi
}
expect_success() { expect success "$@"; }
expect_failure() { expect failure "$@"; }

# Replaces every occurrence of <old> with <new> in <file>; fails if <old> is not there.
replace() {
  node -e '
    const fs = require("fs");
    const [file, from, to] = process.argv.slice(1);
    const text = fs.readFileSync(file, "utf8");
    if (!text.includes(from)) { console.error(`"${from}" not found in ${file}`); process.exit(1); }
    fs.writeFileSync(file, text.split(from).join(to));
  ' "$1" "$2" "$3"
}

# Shows what the demo changed, like a reviewer would see it.
show_diff() { git --no-pager diff --stat && git --no-pager diff -U1 -- "$@" | sed 's/^/    /'; }

start_worktree() {
  DEMO_NAME="$1"
  DEMO_BRANCH="demo/$DEMO_NAME"
  DEMO_BASE="$(git -C "$ROOT" rev-parse HEAD)"
  DEMO_DIR="$(mktemp -d)/$DEMO_NAME"
  git -C "$ROOT" worktree add --quiet -b "$DEMO_BRANCH" "$DEMO_DIR" HEAD
  trap finish EXIT
  cd "$DEMO_DIR"
  say "worktree $DEMO_DIR on branch $DEMO_BRANCH (from $(git rev-parse --short HEAD))"
  pnpm install --frozen-lockfile --prefer-offline --silent
  # The compatibility check compares against the commit the demo started from.
  export BASE_SHA="$DEMO_BASE"
}

finish() {
  local status=$?
  cd "$ROOT"
  if [ -n "${DEMO_DIR:-}" ] && [ "${KEEP:-}" != 1 ]; then
    git worktree remove --force "$DEMO_DIR" 2>/dev/null || true
    git branch --quiet -D "$DEMO_BRANCH" 2>/dev/null || true
  elif [ -n "${DEMO_DIR:-}" ]; then
    say "kept: $DEMO_DIR (branch $DEMO_BRANCH)"
  fi
  if [ "$failures" -gt 0 ]; then
    printf '\n\033[31m✖ %s expectation(s) failed.\033[0m\n' "$failures"
    exit 1
  fi
  [ "$status" -eq 0 ] && printf '\n\033[32m✔ Demo finished as expected.\033[0m\n'
  exit "$status"
}

nx() { pnpm nx "$@" --output-style=static; }

# Demos that run on the main working tree (no worktree) still report failed expectations.
trap finish EXIT
