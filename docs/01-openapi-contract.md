# OpenAPI contract

## TL;DR

Each HTTP API is one OpenAPI 3.1 document split into small files
(`contracts/apis/<api>/openapi.yaml` + `paths/` + `components/`), with error components shared by
every API in `contracts/shared/`. It is the only place where an endpoint, a field or an error is
defined.

## What pain it solves

When the API lives in a wiki and in each repository's code, there are as many versions of it as
there are repositories. A field the backend calls `dueAt` is `due_date` in the app and `dueDate` in
the BFF, and nobody can say which one is right.

## How it works

```
contracts/
├── apis/
│   ├── library/      # public: web → backend (books, loans, /v2/books in preview)
│   │   ├── openapi.yaml
│   │   ├── paths/        # one file per path: v1-books.yaml, v1-loans-by-loan-id.yaml, ...
│   │   └── components/   # schemas, parameters
│   └── inventory/    # internal: backend → inventory Lambda (stock, reservations)
└── shared/components/    # Problem Details, the problem type catalog, error responses
```

Conventions, all checked by the [lint](./02-lint-and-bundle.md):

- every path starts with a major version: `/v1/books`, `/v2/books`;
- `operationId` exists, is unique and is camelCase: it becomes the name of a generated function
  (`listBooks` → `useListBooks`);
- kebab-case, plural paths (`/v1/loans/{loanId}`);
- every operation declares `x-stability-level` (`draft`, `alpha`, `beta`, `stable`), see
  [stability and preview](./08-stability-and-preview.md);
- identifiers are UUIDs, dates are ISO 8601 with a timezone (`format: date-time`);
- collections use **cursor pagination** (`?cursor=…&limit=…` → `{ items, nextCursor }`): stable
  under inserts, unlike offsets;
- request bodies set `additionalProperties: false` (strict); response schemas do not;
- examples contain no personal data: `Book title 1`, generated UUIDs, `.test` domains.

### Errors: RFC 9457 Problem Details and a type catalog

Every error is `application/problem+json`:

```json
{
  "type": "urn:acme:problem:validation",
  "title": "Invalid request",
  "status": 400,
  "detail": "The request has 1 invalid field.",
  "errors": [{ "pointer": "/priority", "detail": "Unknown field: requests are strict." }]
}
```

`type` comes from a **catalog** shared by both APIs (`contracts/shared/components/schemas/ProblemType.yaml`):
`validation`, `not-found`, `book-not-found`, `loan-not-found`, `book-unavailable`,
`service-unavailable` and `internal`, all as `urn:acme:problem:*`. Clients branch on `type` (for
example to word the message themselves) and fall back to `title` and `detail` for types they do not
know yet, because a new problem type is an additive change: the generated schema reads it as
`unknown`, exactly like any other [response enum](./04-tolerant-responses.md).

`errors[].pointer` is a JSON Pointer into the body (`/bookId`), or `#/query/<name>` and
`#/path/<name>` for parameters, so a form can highlight the right field.

### Two APIs, one set of rules

The inventory API is internal, called by the backend through `@acme/inventory-client`. It still
gets lint, generation, tolerant responses and the oasdiff check: a Lambda deployed on Tuesday must
not break a backend deployed on Monday ([ADR 0007](./adr/0007-inventory-as-a-separate-service.md)).

## Day-to-day usage

1. Edit the YAML (a path file, a schema in `components/`, or `shared/` for errors).
2. `pnpm nx run contracts:generate` (lint → bundle → Orval → post-processing → event generator).
3. `pnpm nx run contracts:compat` to see whether the change is breaking.
4. `pnpm changeset` for the packages generated from that API.
5. Open the pull request: its review is an API design conversation, before any code exists.

`pnpm nx run contracts:portal` builds the developer portal into `contracts/artifacts/portal/`: a page
per API with its operations and stability levels, and its interactive reference (Scalar).

## Trade-offs

- Split files are easier to review than a 2,000-line YAML, but need a bundle step before tools
  that read a single file (Orval, oasdiff).
- One catalog of problem types means agreeing on names across teams; the alternative, free-form
  `type` URLs per service, makes clients unable to branch on them.
- Hand-written YAML is verbose. Code-first generation (from controllers) was not chosen because it
  makes the contract a side effect of the implementation: the review comes after the code.

## How to demonstrate

- [Demo 1](../demos/01-convention-blocked.sh): an unversioned path and a snake_case operationId are
  rejected.
- [Demo 8](../demos/08-strict-request.sh): a field the contract does not have gets a 400 Problem
  Details pointing at it.

## Frequently asked questions

**Why URNs and not URLs for problem types?** RFC 9457 allows any URI. URLs suggest a page exists
and tie the identifier to a domain; URNs are stable names and contain no real domain.

**Where do I put a new error?** Add a value to `ProblemType.yaml` (additive), a response in
`shared/components/responses/` and reference it from the operations that return it.
