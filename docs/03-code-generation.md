# Code generation

## TL;DR

`pnpm nx run contracts:generate` turns the bundled contracts into TypeScript packages: Zod schemas
and types, TanStack Query hooks, a fetch client, request validators and MSW mocks. Nobody writes
them by hand, and nobody edits them: they are git-ignored and rebuilt from the contract.

## What pain it solves

Every repository used to write its own `interface Loan`, its own validation and its own mocks.
They drift silently: the mock still returns `author` months after the API moved on, so the
frontend's tests pass against an API that no longer exists.

## How it works

One `contracts/orval.config.ts` (Orval 8.46.0) reads the bundles:

| Orval project         | Output                                                                                                      | Published as                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `library`             | Zod schemas (`*.zod.ts`), TanStack Query v5 hooks (`fetch`), MSW handlers                                   | `@acme/api-types`, `@acme/api-client` (`/mocks`) |
| `libraryValidators`   | one strict validator per operation and location (`CreateLoanBody`, `GetBookParams`), path and query coerced | `@acme/api-types/validators`                     |
| `inventory`           | Zod schemas, a fetch client with a runtime base URL (mutator), MSW handlers                                 | `@acme/inventory-client` (`/mocks`)              |
| `inventoryValidators` | strict validators of the inventory API                                                                      | `@acme/inventory-client/validators`              |

Shared Zod settings: no reusable schemas, and `strict` for params, query, headers and bodies, but
**not** for responses. After Orval, `apply-response-enum-fallback.ts` makes the response schemas
tolerant ([tolerant responses](./04-tolerant-responses.md)), and `generate-events.ts` builds
`@acme/events` from the [event catalog](./10-events.md).

```ts
// what a consumer writes
import { useGetLoan } from '@acme/api-client';
import { Loan } from '@acme/api-types';

const loan = useGetLoan(loanId, { query: { select: (r) => toApiResult(Loan, 200, r) } });
```

```ts
// what the backend writes
import { CreateLoanBody } from '@acme/api-types/validators';

@Post()
createLoan(@Body(new ZodValidationPipe(CreateLoanBody, 'body')) body: z.output<typeof CreateLoanBody>) {}
```

```ts
// tests and the frontend's mock mode
import { getAcmeLibraryAPIMock, getGetLoanResponseMock } from '@acme/api-client/mocks';
```

Packages are built with tsdown (ESM + `.d.ts`), checked by publint, and only re-export generated
code: their `src/index.ts` has no hand-written logic. The one exception is
`@acme/inventory-client`'s mutator (`src/http/custom-fetch.ts`), which lets the backend set the
inventory base URL at runtime (`configureInventoryClient({ baseUrl })`).

Generated files live in `**/src/generated/` and `contracts/artifacts/`, both git-ignored. The
[clean-clone check](./06-ci-and-compatibility.md) proves a fresh clone can install, generate and
pass its tests without them.

## Day-to-day usage

```bash
pnpm nx run contracts:generate            # all of it (cached by Nx on contract + generator inputs)
pnpm nx run @acme/api-client:build        # builds a package (generates first if needed)
pnpm nx run @acme/tools:clean-clone       # proves nothing generated is committed
```

## Trade-offs

- The output is coupled to Orval's shape. The post-processing works on the AST and is fully tested,
  so an Orval upgrade that changes the shape fails the tests instead of shipping a wrong client;
  Orval is pinned to an exact version.
- Orval writes extension-less relative imports. That is fine for packages bundled by tsdown and for
  Vite, but a Node ESM consumer of raw sources would need `.js` extensions.
- `coerce` only applies to the per-operation validators (`client: 'zod'`), not to model schemas,
  hence the separate `*Validators` projects.
- Generating in every consuming repository (instead of publishing packages) was rejected: each
  repository would pin a different contract version without anyone seeing it.

## How to demonstrate

[Demo 2](../demos/02-additive-change.sh) adds an optional `isbn` to `Book`, regenerates, and shows
the new optional field in the Zod schema while the old client and the web app keep passing.

## Frequently asked questions

**Can I edit a generated file to fix something quickly?** No ([AGENTS.md](../AGENTS.md)). Change
the contract or the generator; the next `generate` would overwrite the edit anyway.

**Why both types and Zod?** Types disappear at runtime. A response that does not match the contract
must be caught where it enters the app, not three screens later; see the FAQ.
