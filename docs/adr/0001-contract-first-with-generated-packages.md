# 0001. Contract-first with generated, published packages

- **Status:** accepted
- **Date:** 2026-11-06

## Context

Every repository (backend, web, mobile, BFF) rewrites types, validation, clients and mocks from a
YAML file kept as documentation. They drift, and nothing tells anyone when a change breaks a client.

## Decision

The OpenAPI documents in `contracts/` are the only definition of the HTTP APIs, and JSON Schemas in
`contracts/events/` the only definition of events. Types, Zod schemas, clients, validators and mocks
are generated from them and published as versioned npm packages (`@acme/api-types`,
`@acme/api-client`, `@acme/inventory-client`, `@acme/events`), next to a hand-written package of
pure shared rules (`@acme/domain`). Generated code is never committed or edited.

## Consequences

- Consumers depend on explicit versions and get changelogs.
- A field reaches a consumer only after a contract change, a release and an upgrade; previews and
  stability levels keep that short ([0005](./0005-snapshot-instead-of-pre-mode.md)).
- In this POC, `contracts/` lives in the same monorepo as the apps to keep the demo self-contained;
  in real life it would be its own repository and the apps would install from a private registry.
