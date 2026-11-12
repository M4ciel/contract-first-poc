# @acme/domain

Pure business rules of the library, shared by the backend and the frontend so both always agree.
No I/O, 100% test coverage and a mutation score of 100.

## Install

The packages live in the private registry. Locally that is the Verdaccio started by `pnpm nx run @acme/infra:up`:

```ini
# .npmrc
@acme:registry=http://localhost:4873/
```

```bash
pnpm add @acme/domain
```

## Use

```ts
import { calculateDueDate, isLoanOverdue } from '@acme/domain';

const dueAt = calculateDueDate(new Date()); // 14 days by default (DEFAULT_LOAN_POLICY)
const overdue = isLoanOverdue(dueAt, new Date());
```
