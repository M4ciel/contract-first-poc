# @acme/api-types

Zod schemas and TypeScript types generated from the **Library API** contract
(`contracts/apis/library/openapi.yaml`). Do not edit: the package is regenerated from the contract.

- **Responses are tolerant:** unknown fields are dropped and unknown enum values become
  `'unknown'`, so a newer API never breaks an older client.
- **Requests are strict** (`@acme/api-types/validators`): what the backend accepts, nothing more.

## Install

The packages live in the private registry. Locally that is the Verdaccio started by `pnpm nx run @acme/infra:up`:

```ini
# .npmrc
@acme:registry=http://localhost:4873/
```

```bash
pnpm add @acme/api-types zod
```

## Use

```ts
import { Loan, type LoanOutput } from '@acme/api-types';

const loan: LoanOutput = Loan.parse(await response.json()); // a status it does not know → 'unknown'
```

```ts
// In the backend: validate a request exactly as the contract describes it.
import { CreateLoanBody } from '@acme/api-types/validators';

const body = CreateLoanBody.parse(request.body); // an extra field is rejected
```
