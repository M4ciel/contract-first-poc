# 0002. Strict Zod requests, tolerant responses

- **Status:** accepted
- **Date:** 2026-11-06

## Context

Orval generates strict object schemas and closed enums. That is right for requests, but an old
client parsing a response breaks when the server adds a field or an enum value, two changes the
compatibility rules allow.

## Decision

After generation, a script rewrites only the response schemas, on the TypeScript AST: strict and
loose objects become `z.object` (unknown keys dropped), and every string enum gains `'unknown'` and
`.catch('unknown')`. Response schemas are found through the generated client (aliases with both
`data` and `status`). Request schemas and validators stay strict. The generation fails if a
response type has no matching schema.

## Consequences

- Old clients survive additive changes; a new enum value reaches the UI as `unknown`, which the
  type system forces every switch to handle.
- The script is coupled to Orval's output shape; its core is pure and fully tested, and Orval is
  pinned.
- A server typo in an enum value would also become `unknown`; the backend's contract tests require
  that nothing is dropped when its own responses are parsed.
