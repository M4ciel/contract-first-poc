# @acme/api-client

TanStack Query hooks and MSW mock handlers generated from the **Library API** contract. Versioned
together with `@acme/api-types`: both always have the same version.

## Install

The packages live in the private registry. Locally that is the Verdaccio started by `pnpm nx run @acme/infra:up`:

```ini
# .npmrc
@acme:registry=http://localhost:4873/
```

```bash
pnpm add @acme/api-client @acme/api-types @tanstack/react-query react zod
pnpm add -D msw   # only for the mocks
```

## Use

The client calls the API on the same origin (`/v1/...`). It resolves every status and does not
validate: parse the body with the tolerant schema of `@acme/api-types`.

```tsx
import { useGetLoan } from '@acme/api-client';
import { Loan } from '@acme/api-types';

const loan = useGetLoan(loanId, {
  query: {
    select: (response) => (response.status === 200 ? Loan.parse(response.data) : undefined),
  },
});
```

## Work without a backend

```ts
import { setupWorker } from 'msw/browser';
import { getAcmeLibraryAPIMock } from '@acme/api-client/mocks';

await setupWorker(...getAcmeLibraryAPIMock()).start();
```
