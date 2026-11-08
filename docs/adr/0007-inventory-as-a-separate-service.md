# 0007. Inventory as a separate service with its own contract

- **Status:** accepted
- **Date:** 2026-11-06

## Context

Copies of books (stock, reservations) could be a module of the backend. Service-to-service calls
are where silent breakage hurts most, and the POC should show contract-first there too.

## Decision

The inventory is a Lambda behind API Gateway with its own OpenAPI contract
(`contracts/apis/inventory`). The backend calls it over HTTP through the generated
`@acme/inventory-client`; the Lambda validates with the generated validators. Lint, generation,
tolerant responses and oasdiff apply to it like to the public API.

## Consequences

- The backend survives additive changes to the Lambda, and a breaking change to it fails CI.
- More moving parts: a second contract, a second client, network failure handling (timeouts become
  503 Problem Details).
