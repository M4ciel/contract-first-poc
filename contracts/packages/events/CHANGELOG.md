# @acme/events

## 0.1.1

### Patch Changes

- f279af4: The contracts repository was reorganised: generators moved to `contracts/tooling/` and each event
  now lives in its own folder (`contracts/events/loan.created/v1.schema.json`). No API or event shape
  changed. The HTTP packages are byte-for-byte the same; `@acme/events` only updates the source paths
  in its generated comments.
- 02373a8: Every package now has a README with how to install it from the private registry and how to use it.
  No code change.

## 0.1.0

### Minor Changes

- dbf9f05: First release of the packages generated from the contracts:

  - `@acme/api-types`: Zod schemas and types of the library API, with tolerant responses (unknown
    fields dropped, unknown enum values read as `unknown`) and strict request validators
    (`/validators`).
  - `@acme/api-client`: TanStack Query hooks and MSW handlers (`/mocks`) of the library API.
  - `@acme/inventory-client`: schemas, fetch client (base URL set at runtime), request validators
    (`/validators`) and MSW handlers of the inventory API.
  - `@acme/domain`: `calculateDueDate` and `isLoanOverdue`.
  - `@acme/events`: types and Zod schemas of `loan.created.v1`, exact for producers and tolerant for
    consumers.
