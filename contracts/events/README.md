# Domain event catalog

Asynchronous events drift just like HTTP APIs, only more silently: a consumer of a queue breaks in
production, not in code review. This folder is the single source of truth for the events the
system publishes, with the same rigour as the OpenAPI contracts.

| Event             | Producer   | Consumers            | Transport                 |
| ----------------- | ---------- | -------------------- | ------------------------- |
| `loan.created.v1` | `apps/api` | `apps/notifications` | EventBridge → SQS (+ DLQ) |

## Rules

- **One folder per event, one JSON Schema (2020-12) per version:**
  `<entity>.<action>/v<N>.schema.json`, for example `loan.created/v1.schema.json` for
  `loan.created.v1`. `$id` is `urn:acme:event:<name>`, `title` is the name, and `x-source` is the
  EventBridge source.
- **Events are immutable.** Once an event is on `main`, its schema never changes: a new shape is a
  new version (`loan.created/v2.schema.json`), published side by side until every consumer has
  moved. `nx run contracts:compat` enforces it against the base commit, matching events by `$id`.
- **Producers are exact, consumers are tolerant.** The schema sets `additionalProperties: false`
  and the producer's tests validate what it publishes against it. Consumers parse with the
  tolerant variant, which ignores fields it does not know.
- **No personal data.** Identifiers and dates only. If a consumer ever needs personal data, it
  receives a pseudonymous id and looks the data up behind access control. The generator rejects
  property names that usually carry personal data (`email`, `name`, `phone`, ...).

## Generated code

`nx run contracts:generate` turns every schema into `@acme/events`:

```ts
import { LOAN_CREATED_V1, LoanCreatedV1, LoanCreatedV1Tolerant } from '@acme/events';
// type LoanCreatedV1         → the payload type (json-schema-to-typescript)
// LoanCreatedV1.parse(...)   → exact (producers, tests)
// LoanCreatedV1Tolerant      → ignores unknown fields (consumers)
```

## What is not automated yet

This catalog validates **payloads**: the producer's tests, the consumer's parsing and the
immutability check. It does not describe **channels** (which bus, which queue, who subscribes) in a
machine-readable way; the table above is documentation only. The natural next step is
[AsyncAPI](https://www.asyncapi.com/): one document per service that references these schemas,
linted and diffed in CI like the OpenAPI contracts.
