#!/usr/bin/env bash
# 7. Frontend without a backend: apps/web on the contract's generated MSW mocks.
# Interactive by default (opens a dev server); --check runs the Playwright test of that mode.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
title '7. Frontend without a backend'
cd "$ROOT" || exit
if [ "${1:-}" = --check ]; then
  expect_success 'the app works on generated mocks, with no backend running' \
    nx run @acme/web:e2e --args=--project=mock-mode
  exit 0
fi
say 'No API, no Docker: MSW answers in the browser with data generated from the contract.'
say 'Add VITE_FLAG_BOOKS_V2=true to build the alpha /v2 screen before the backend has it.'
say 'Open http://localhost:4200 (Ctrl+C to stop).'
VITE_USE_MOCKS=true exec pnpm nx run @acme/web:serve
