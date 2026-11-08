import type { Inventory, Reservation } from '@acme/inventory-client';
import { CreateReservationBody, GetInventoryParams } from '@acme/inventory-client/validators';
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2 as Result,
} from 'aws-lambda';
import type { InventoryStore } from '@store/inventory-store.js';
import { problems, toInvalidParams } from './problems.js';

export interface RouterDependencies {
  readonly store: InventoryStore;
  readonly newId: () => string;
  readonly now: () => Date;
  readonly logError: (error: unknown) => void;
}

const json = (statusCode: number, body: unknown, headers: Record<string, string> = {}): Result => ({
  statusCode,
  headers: { 'content-type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

const readJsonBody = (
  event: APIGatewayProxyEventV2,
): { ok: true; value: unknown } | { ok: false } => {
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body ?? '', 'base64').toString('utf8')
    : (event.body ?? '');
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
};

const getInventory = async (event: APIGatewayProxyEventV2, deps: RouterDependencies) => {
  const params = GetInventoryParams.safeParse(event.pathParameters ?? {});
  if (!params.success) return problems.validation(toInvalidParams(params.error, 'path'));

  const stock = await deps.store.getStock(params.data.bookId);
  if (!stock) return problems.bookNotFound(params.data.bookId);
  const inventory: Inventory = {
    bookId: stock.bookId,
    totalCopies: stock.totalCopies,
    availableCopies: Math.max(stock.totalCopies - stock.reservedCopies, 0),
  };
  return json(200, inventory);
};

const createReservation = async (event: APIGatewayProxyEventV2, deps: RouterDependencies) => {
  const parsed = readJsonBody(event);
  if (!parsed.ok) {
    return problems.validation([{ pointer: '', detail: 'The body is not valid JSON.' }]);
  }
  const body = CreateReservationBody.safeParse(parsed.value);
  if (!body.success) return problems.validation(toInvalidParams(body.error, 'body'));

  const outcome = await deps.store.reserve({
    id: deps.newId(),
    bookId: body.data.bookId,
    loanId: body.data.loanId,
    createdAt: deps.now().toISOString(),
  });
  switch (outcome.status) {
    case 'book-not-found':
      return problems.bookNotFound(body.data.bookId);
    case 'unavailable':
      return problems.bookUnavailable(body.data.bookId);
    case 'reserved': {
      const reservation: Reservation = outcome.reservation;
      return json(201, reservation, { location: `/v1/reservations/${reservation.id}` });
    }
  }
};

/** Routes an API Gateway HTTP API (payload 2.0) request to the operations of the contract. */
export const route = async (
  event: APIGatewayProxyEventV2,
  deps: RouterDependencies,
): Promise<Result> => {
  try {
    switch (event.routeKey) {
      case 'GET /v1/inventories/{bookId}':
        return await getInventory(event, deps);
      case 'POST /v1/reservations':
        return await createReservation(event, deps);
      default:
        return problems.notFound();
    }
  } catch (error) {
    deps.logError(error);
    return problems.internal();
  }
};
