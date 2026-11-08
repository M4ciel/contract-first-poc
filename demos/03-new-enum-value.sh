#!/usr/bin/env bash
# 3. A new enum value does not take down an old client: lost in Loan.status.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
title '3. A new enum value does not take down an old client'
start_worktree new-enum-value

step 'Add lost to Loan.status'
replace contracts/apis/library/components/schemas/Loan.yaml 'enum: [active, returned, overdue]' 'enum: [active, returned, overdue, lost]'
show_diff contracts/apis/library/components/schemas/Loan.yaml
pause

step 'Compatibility'
expect_success 'oasdiff: a new response enum value is additive (clients fall back to unknown)' nx run contracts:compat

step 'An app still on @acme/api-types 1.0.0 receives status: lost'
nx run-many -t build -p @acme/api-types @acme/api-client >/dev/null # regenerate from the contract
expect_success 'tolerant schemas read lost as unknown, raw Orval schemas break, mocks of the new contract parse' \
  env NODE_OPTIONS='--experimental-vm-modules --no-warnings=ExperimentalWarning' \
  pnpm --filter @acme/legacy-client exec jest --coverage=false --verbose \
  --testNamePattern='new enum value|current contract'
say 'The post-processing (contracts/scripts/apply-response-enum-fallback.ts) added "unknown" and'
say '.catch("unknown") to every response enum, so old screens show a neutral label instead of crashing.'
