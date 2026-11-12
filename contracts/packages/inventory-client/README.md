# @acme/inventory-client

Zod schemas, a fetch client, request validators and MSW handlers generated from the internal
**Inventory API** contract (`contracts/apis/inventory/openapi.yaml`). For services only: the
Inventory API is not public.

## Install

The packages live in the private registry. Locally that is the Verdaccio started by `pnpm nx run @acme/infra:up`:

```ini
# .npmrc
@acme:registry=http://localhost:4873/
```

```bash
pnpm add @acme/inventory-client zod
```

## Use

```ts
import { configureInventoryClient, createReservation, Reservation } from '@acme/inventory-client';

configureInventoryClient({ baseUrl: config.inventoryBaseUrl }); // the URL of the environment

const response = await createReservation({ bookId, loanId }, { signal: AbortSignal.timeout(2000) });
if (response.status === 201) {
  const reservation = Reservation.parse(response.data); // tolerant: new fields are ignored
}
```

The Inventory service itself validates requests with `@acme/inventory-client/validators`, and
tests can mock it at the network level with `@acme/inventory-client/mocks`.
