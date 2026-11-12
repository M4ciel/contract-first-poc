# Domain event catalog

Asynchronous events drift just like HTTP APIs, only more silently: a consumer of a queue breaks in
production, not in code review. This folder is the single source of truth for the events the
system publishes, with the same rigour as the OpenAPI contracts.

- **Payloads:** one JSON Schema per event version (`<event>/vN.schema.json`), the source of
  `@acme/events`.
- **Channels:** [`asyncapi.yaml`](./asyncapi.yaml) (AsyncAPI 3) says where each event travels: the
  EventBridge bus it is published on, the SQS queue each consumer reads (with its dead-letter
  queue), who sends and who receives, and the envelope EventBridge wraps around the payload. It
  references the schemas, never copies them.
- **Ownership:** a `catalog-info.yaml` per event ([software catalog](../../docs/17-software-catalog.md)).

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
- **Every event has a `catalog-info.yaml`** in its folder: owner, system, and the producer and
  consumers declare it in `providesApis` / `consumesApis` ([software catalog](../../docs/17-software-catalog.md)).

## Generated code

`nx run contracts:generate` turns every schema into `@acme/events`:

```ts
import { LOAN_CREATED_V1, LoanCreatedV1, LoanCreatedV1Tolerant } from '@acme/events';
// type LoanCreatedV1         → the payload type (json-schema-to-typescript)
// LoanCreatedV1.parse(...)   → exact (producers, tests)
// LoanCreatedV1Tolerant      → ignores unknown fields (consumers)
```

## Channels (AsyncAPI)

`nx run contracts:contract-lint` lints `asyncapi.yaml` with the same Redocly setup as the HTTP APIs
(two rules are off for it, with the reason in `redocly.yaml`), and `nx run contracts:bundle` writes
a single-file version to `artifacts/events/lending-events.asyncapi.yaml`. A test fails when an event
schema is not referenced by the document.

**Adding a consumer:** a rule and a queue in Terraform, a channel and a `receive` operation here,
and `consumesApis` in the consumer's `catalog-info.yaml`.

## What is not automated yet

Payloads are protected (immutability, producer tests, tolerant consumers). Channels are not diffed:
there is no mature AsyncAPI equivalent of oasdiff, so renaming a bus or a queue in this document is
not blocked in CI. Review catches it; the infrastructure would break loudly.
