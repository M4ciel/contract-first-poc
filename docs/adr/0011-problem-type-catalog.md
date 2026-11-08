# 0011. A shared catalog of problem types

- **Status:** accepted
- **Date:** 2026-11-06

## Context

RFC 9457 Problem Details allows any URI as `type`. Free-form types per service make it impossible
for clients to branch on them, and a generic `about:blank` hides the cause.

## Decision

`contracts/shared/components/schemas/ProblemType.yaml` is an enum of `urn:acme:problem:*` types
(`validation`, `not-found`, `book-not-found`, `loan-not-found`, `book-unavailable`,
`service-unavailable`, `internal`) shared by both APIs. Validation problems carry `errors[]` with a
JSON Pointer per field. Being a response enum, it gets the `unknown` fallback.

## Consequences

- Clients can word errors themselves and fall back to `title` for types they do not know.
- A new problem type is an additive change; renaming one is breaking.
- `about:blank` remains only for framework errors the contract does not describe.
