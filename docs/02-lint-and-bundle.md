# Lint and bundle

## TL;DR

Redocly turns the API conventions into **errors** that fail the pull request, then bundles each
split contract into a single file that the generator and oasdiff read.

## What pain it solves

Conventions that live in a wiki are followed until the first deadline. One team ships `/books`
without a version, another names an operation `list_books`, and both become permanent the moment a
client depends on them.

## How it works

`contracts/redocly.yaml` lists both APIs and extends `recommended` with project rules:

```yaml
rules:
  operation-operationId: error # becomes a generated function name
  operation-operationId-unique: error
  paths-kebab-case: error
  path-segment-plural:
    severity: error
    exceptions: [v1, v2, health]

  rule/operation-id-camel-case: # assertion on Operation.operationId
    severity: error
    subject: { type: Operation, property: operationId }
    assertions: { casing: camelCase }

  rule/versioned-paths: # every path starts with /v1, /v2, ...
    severity: error
    subject: { type: Paths }
    assertions: { pattern: /^\/v[1-9][0-9]*(?:\/|$)/ }

  rule/operation-stability-level: # x-stability-level is required and valid
    severity: error
    subject: { type: Operation, property: x-stability-level }
    assertions: { defined: true, enum: [draft, alpha, beta, stable] }
```

Exceptions are explicit and reviewed: `.redocly.lint-ignore.yaml` holds each one with its reason
(today only "a health check has no 4xx response").

`redocly bundle` then writes `contracts/artifacts/<api>.bundle.yaml` (git-ignored): one
self-contained file per API, input of Orval, oasdiff and the API reference portal.

In Nx, `contracts:bundle` depends on `contracts:contract-lint`, and `contracts:generate` depends on
`bundle`: nothing is generated from a contract that does not pass the lint.

## Day-to-day usage

```bash
pnpm nx run contracts:contract-lint   # lint both APIs
pnpm nx run contracts:bundle          # lint + bundle
pnpm nx run contracts:reference       # + API reference portal (artifacts/reference/index.html)
```

The `x-stability-level` rule is also covered by tests (`contracts/scripts/compat/stability-levels.spec.ts`)
that lint fixtures with a missing and an invalid level.

## Trade-offs

- Configurable rules (assertions) cover most conventions without writing a plugin. Conventions that
  need code (for example "every list operation has a `cursor` parameter") would need a custom
  Redocly plugin; we have not needed one yet.
- Spectral is the common alternative. Redocly was chosen because one tool lints, bundles and
  splits, and its assertion syntax keeps rules declarative.

## How to demonstrate

[Demo 1](../demos/01-convention-blocked.sh) adds `GET /books` (no version) with
`operationId: list_books` and shows Redocly failing with both errors.

## Frequently asked questions

**Can I disable a rule for one operation?** Add it to `.redocly.lint-ignore.yaml` with a comment
saying why. Prefer fixing the contract: every entry is a permanent exception.

**Why is the bundle not committed?** It is generated from the split files; committing it would
create a second source of truth that can drift ([AGENTS.md](../AGENTS.md)).
