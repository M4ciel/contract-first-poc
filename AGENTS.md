# AGENTS.md

Rules for AI coding agents (Claude Code, Copilot, Cursor, ...) working in this repository.
Humans should follow them too. `CLAUDE.md` only imports this file, so there is a single source.

## Source of truth

- HTTP APIs are defined **only** in `contracts/apis/<api>/openapi.yaml` (+ its `paths/` and
  `components/`), with error components shared in `contracts/shared/`. Today there are two:
  `library` (public, web → backend) and `inventory` (internal, backend → Lambda). Types, Zod
  schemas, HTTP clients and mocks are **generated** from them.
- Domain events are defined only in `contracts/events/` (JSON Schema, immutable: a new shape is a
  new version). `@acme/events` is generated from it.
- Shared business rules live only in `@acme/domain` (pure functions, no I/O).

## Tooling

- Node.js and pnpm versions are pinned in `.nvmrc` and `package.json#engines`. Run `nvm use` first.
- Monorepo tasks run through Nx: `pnpm nx run-many -t lint test typecheck`, `pnpm nx affected -t ...`.
- Regenerate code with `pnpm nx run contracts:generate` after any contract change.
- Check contract compatibility with `pnpm nx run contracts:compat` (oasdiff against the base
  commit; set `BASE_SHA` to choose it, default is the merge-base with `main`).
- Local AWS (MiniStack) and the npm registry (Verdaccio) run with `docker compose`.
- Imports never climb with `../`. Use a path inside the same folder tree (`./x`, `./sub/x`), a
  package name (`@acme/domain`) or a folder alias of the project (`@config/...`, `@problems/...`,
  declared in `paths` of its tsconfig.json). ESLint enforces it.

## Compatibility rules

- Every route starts with a major version (`/v1`, `/v2`).
- In a `stable` or `beta` operation, only **additive** changes are allowed: optional response field,
  new endpoint, new optional parameter, new enum value in a response.
- Breaking changes go to a new operation or a new major version (`/v2`), never into an existing
  stable one. Deprecate with `deprecated: true` and add a replacement.
- Requests are strict, responses are tolerant. Do not change that split.

## Workflow

- Small commits using Conventional Commits (`feat(contract): ...`, `fix(api): ...`, `docs: ...`).
- Any change to a publishable package needs a changeset (`pnpm changeset`).
- Run lint, tests, typecheck and the contract compatibility check before proposing a change.

## Forbidden

- Editing generated files (`**/src/generated/**`, `artifacts/`). Change the contract or the generator.
- Committing generated files.
- Adding or changing endpoints, fields or events without explicit human approval of the contract.
- Weakening a check to make CI pass: lint rules, `oasdiff`, coverage or mutation thresholds,
  module boundaries. If a check fails, fix the change, not the check.
- Publishing packages, pushing tags or running release workflows without an explicit request.
- Adding personal data, real company names, real domains or internal URLs anywhere, including
  fixtures, mocks, examples and logs.
