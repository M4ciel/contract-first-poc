#!/usr/bin/env bash
# 9. Mutation testing: a weak test (no boundary check) lets a mutant survive.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
title '9. Mutation testing'
start_worktree mutation-testing
spec=contracts/packages/domain/src/loan.spec.ts

step 'Delete the tests that check the exact due instant (the boundary)'
node -e '
  const fs = require("fs");
  const file = process.argv[1];
  let text = fs.readFileSync(file, "utf8");
  for (const name of [
    "is not overdue exactly at the due instant",
    "is overdue one millisecond after the due instant",
  ]) {
    const start = text.indexOf("  it(\x27" + name + "\x27");
    if (start < 0) throw new Error("test not found: " + name);
    const end = text.indexOf("\n  });\n", start) + "\n  });\n".length;
    text = text.slice(0, start) + text.slice(end);
  }
  fs.writeFileSync(file, text);
' "$spec"
show_diff "$spec"
pause

step 'Coverage still looks perfect'
expect_success 'every line still runs: 100% coverage' nx run @acme/domain:test --skip-nx-cache

step 'Stryker changes the code and expects a test to fail'
expect_failure 'a mutant survives (now > dueAt became now >= dueAt) and the score drops below 100' \
  nx run @acme/domain:mutation --skip-nx-cache
say 'Coverage says a line ran; a killed mutant says a test checks it.'
