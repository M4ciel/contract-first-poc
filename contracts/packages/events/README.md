# @acme/events

Types and Zod schemas generated from the domain event catalog (`contracts/events`). Every event
has an **exact** schema for producers and a **tolerant** one for consumers. Where each event travels
(bus, queues) is described in `contracts/events/asyncapi.yaml`.

## Install

The packages live in the private registry. Locally that is the Verdaccio started by `pnpm nx run @acme/infra:up`:

```ini
# .npmrc
@acme:registry=http://localhost:4873/
```

```bash
pnpm add @acme/events zod
```

## Use

```ts
// Producer: publish exactly the shape of the catalog.
import { LOAN_CREATED_V1, LOAN_CREATED_V1_SOURCE, LoanCreatedV1 } from '@acme/events';

const detail = LoanCreatedV1.parse({ loanId, bookId, startedAt, dueAt }); // extra field → error
// put it on the bus with Source = LOAN_CREATED_V1_SOURCE and DetailType = LOAN_CREATED_V1
```

```ts
// Consumer: ignore fields added by later producers.
import { LoanCreatedV1Tolerant } from '@acme/events';

const event = LoanCreatedV1Tolerant.parse(envelope.detail);
```
