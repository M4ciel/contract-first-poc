# 0005. Snapshot previews instead of pre mode

- **Status:** accepted
- **Date:** 2026-11-08

## Context

Contracts that are still `alpha` must be installable by the teams building them, without reaching
`latest`.

## Decision

Previews use `changeset version --snapshot preview` (`0.2.0-preview-<datetime>`, from the
calculated version) and `changeset publish --tag preview --no-git-tag`, guarded so the job fails
when no `-preview-` version was produced. Changesets' pre mode was rejected: it puts the whole
`main` in prerelease mode (`pre.json`), which conflicts with trunk-based development.

## Consequences

- Snapshots are ephemeral: nothing is committed and `latest` never moves.
- Production safety comes from feature flags in the consumers, not from the registry.
