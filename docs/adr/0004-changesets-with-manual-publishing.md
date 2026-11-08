# 0004. Changesets with manual publishing

- **Status:** accepted
- **Date:** 2026-11-08

## Context

Releases were manual and undocumented. Packages generated from the same contract must share
versions where their types depend on each other.

## Decision

Changesets versions the published packages, with `@acme/api-types` and `@acme/api-client` in a
fixed group, restricted access and no automatic commits. A workflow keeps a Version PR on `main`;
publishing happens only through `release.yml` and `preview.yml`, run by hand on `main`, sharing a
concurrency group. Without a configured registry they publish to a disposable Verdaccio inside the
job. Because packages are generated from `contracts/`, a custom check maps changed contract paths to
packages and requires a changeset for each.

## Consequences

- Every release is deliberate, with changelogs written for consumers.
- The Version PR, created with `GITHUB_TOKEN`, does not trigger CI; a GitHub App token would.
