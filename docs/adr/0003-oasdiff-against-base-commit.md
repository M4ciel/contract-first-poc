# 0003. oasdiff against the exact base commit

- **Status:** accepted
- **Date:** 2026-11-07

## Context

Breaking changes were caught, if at all, by reviewers. Comparing a pull request with the current
`main` gives wrong answers when `main` moves while the pull request is open.

## Decision

CI runs `oasdiff breaking --fail-on ERR` for every API against the contract of the exact base
commit (`pull_request.base.sha`, or `before` on a push), extracted with `git archive` and bundled
like HEAD. The binary is pinned and its SHA-256 verified. The check skips with a message when there
is no base, fails when an API disappears, and also fails when a published event file changes.

## Consequences

- Breaking changes in `beta` and `stable` operations cannot be merged; `alpha` is free
  ([0005](./0005-snapshot-instead-of-pre-mode.md)).
- The check is never weakened to make a pull request pass; deliberate exceptions go through a
  reviewed severity file with tests ([0012](./0012-oasdiff-severity-for-new-enum-values.md)).
- oasdiff checks shapes, not meaning: some risky changes still need review
  ([compatibility rules](../09-compatibility-rules.md)).
