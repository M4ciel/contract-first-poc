import { Inventory, ProblemDetails, Reservation } from '@acme/inventory-client';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import type { z } from 'zod';
import { InMemoryInventoryStore } from '@store/in-memory-inventory-store.js';
import type { InventoryStore } from '@store/inventory-store.js';
import { route, type RouterDependencies } from './router.js';

const BOOK_ID = '7c1e4b52-3f0a-4d8e-9b6a-1f2e3d4c5b6a';
const LAST_COPY_BOOK_ID = '00000000-0000-4000-8000-000000000002';
const LOAN_ID = '0b9d8c7e-6f5a-4b3c-8d2e-1a0f9e8d7c6b';
const RESERVATION_ID = '5e4d3c2b-1a09-4f8e-8d7c-6b5a4f3e2d1c';
const NOW = new Date('2026-03-01T10:00:00.000Z');

const event = (routeKey: string, overrides: Partial<APIGatewayProxyEventV2> = {}) =>
  ({ routeKey, isBase64Encoded: false, ...overrides }) as APIGatewayProxyEventV2;

const reserveEvent = (body: unknown, overrides: Partial<APIGatewayProxyEventV2> = {}) =>
  event('POST /v1/reservations', { body: JSON.stringify(body), ...overrides });

let store: InMemoryInventoryStore;
let logged: unknown[];
let deps: RouterDependencies;
beforeEach(() => {
  store = new InMemoryInventoryStore([
    { bookId: BOOK_ID, totalCopies: 3, reservedCopies: 1 },
    { bookId: LAST_COPY_BOOK_ID, totalCopies: 1, reservedCopies: 0 },
  ]);
  logged = [];
  deps = {
    store,
    newId: () => RESERVATION_ID,
    now: () => NOW,
    logError: (error) => logged.push(error),
  };
});

/** The body parses with the schema generated from the contract and nothing is dropped. */
const contractBody = <S extends z.ZodType>(schema: S, body: string | undefined) => {
  const value: unknown = JSON.parse(body ?? '');
  expect(schema.parse(value)).toEqual(value);
  return value;
};

describe('GET /v1/inventories/{bookId}', () => {
  it('returns the stock with the available copies', async () => {
    const result = await route(
      event('GET /v1/inventories/{bookId}', { pathParameters: { bookId: BOOK_ID } }),
      deps,
    );

    expect(result.statusCode).toBe(200);
    expect(contractBody(Inventory, result.body)).toEqual({
      bookId: BOOK_ID,
      totalCopies: 3,
      availableCopies: 2,
    });
  });

  it('answers 404 book-not-found for an unknown book', async () => {
    const result = await route(
      event('GET /v1/inventories/{bookId}', {
        pathParameters: { bookId: '00000000-0000-4000-8000-000000000099' },
      }),
      deps,
    );

    expect(result.statusCode).toBe(404);
    expect(result.headers?.['content-type']).toBe('application/problem+json');
    expect(contractBody(ProblemDetails, result.body)).toMatchObject({
      type: 'urn:acme:problem:book-not-found',
    });
  });

  it('answers 400 with the path pointer for an id that is not a UUID', async () => {
    const result = await route(
      event('GET /v1/inventories/{bookId}', { pathParameters: { bookId: 'not-a-uuid' } }),
      deps,
    );

    expect(result.statusCode).toBe(400);
    expect(contractBody(ProblemDetails, result.body)).toMatchObject({
      type: 'urn:acme:problem:validation',
      errors: [{ pointer: '#/path/bookId' }],
    });
  });

  it('answers 400 when the path parameter is missing', async () => {
    const result = await route(event('GET /v1/inventories/{bookId}'), deps);

    expect(result.statusCode).toBe(400);
  });
});

describe('POST /v1/reservations', () => {
  it('reserves a copy and returns 201 with Location', async () => {
    const result = await route(reserveEvent({ bookId: BOOK_ID, loanId: LOAN_ID }), deps);

    expect(result.statusCode).toBe(201);
    expect(result.headers?.['location']).toBe(`/v1/reservations/${RESERVATION_ID}`);
    expect(contractBody(Reservation, result.body)).toEqual({
      id: RESERVATION_ID,
      bookId: BOOK_ID,
      loanId: LOAN_ID,
      status: 'active',
      createdAt: NOW.toISOString(),
    });
    expect(await store.getStock(BOOK_ID)).toMatchObject({ reservedCopies: 2 });
  });

  it('reads a base64-encoded body', async () => {
    const body = Buffer.from(JSON.stringify({ bookId: BOOK_ID, loanId: LOAN_ID })).toString(
      'base64',
    );

    const result = await route(
      event('POST /v1/reservations', { body, isBase64Encoded: true }),
      deps,
    );

    expect(result.statusCode).toBe(201);
  });

  it('answers 409 book-unavailable once the last copy is taken', async () => {
    const first = await route(reserveEvent({ bookId: LAST_COPY_BOOK_ID, loanId: LOAN_ID }), deps);
    const second = await route(reserveEvent({ bookId: LAST_COPY_BOOK_ID, loanId: LOAN_ID }), deps);

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(409);
    expect(contractBody(ProblemDetails, second.body)).toMatchObject({
      type: 'urn:acme:problem:book-unavailable',
    });
  });

  it('answers 404 book-not-found for an unknown book', async () => {
    const result = await route(
      reserveEvent({ bookId: '00000000-0000-4000-8000-000000000099', loanId: LOAN_ID }),
      deps,
    );

    expect(result.statusCode).toBe(404);
  });

  it('rejects unknown fields: requests are strict', async () => {
    const result = await route(
      reserveEvent({ bookId: BOOK_ID, loanId: LOAN_ID, priority: 'high' }),
      deps,
    );

    expect(result.statusCode).toBe(400);
    expect(contractBody(ProblemDetails, result.body)).toMatchObject({
      errors: [{ pointer: '/priority', detail: 'Unknown field: requests are strict.' }],
    });
  });

  it('reports every invalid field with a JSON Pointer', async () => {
    const result = await route(reserveEvent({ bookId: 'nope' }), deps);

    const problem = contractBody(ProblemDetails, result.body) as z.output<typeof ProblemDetails>;
    expect(problem.errors?.map((error) => error.pointer).sort()).toEqual(['/bookId', '/loanId']);
  });

  it('answers 400 for a body that is not JSON', async () => {
    const result = await route(event('POST /v1/reservations', { body: '{oops' }), deps);

    expect(result.statusCode).toBe(400);
    expect(contractBody(ProblemDetails, result.body)).toMatchObject({ errors: [{ pointer: '' }] });
  });

  it('answers 400 for a missing body', async () => {
    const result = await route(event('POST /v1/reservations'), deps);

    expect(result.statusCode).toBe(400);
  });
});

describe('routing and failures', () => {
  it('answers 404 not-found for a route outside the contract', async () => {
    const result = await route(event('GET /v1/other'), deps);

    expect(result.statusCode).toBe(404);
    expect(contractBody(ProblemDetails, result.body)).toMatchObject({
      type: 'urn:acme:problem:not-found',
    });
  });

  it('answers 500 internal and logs when the store fails', async () => {
    const failure = new Error('table is gone');
    const broken: InventoryStore = {
      getStock: () => Promise.reject(failure),
      reserve: () => Promise.reject(failure),
    };

    const result = await route(
      event('GET /v1/inventories/{bookId}', { pathParameters: { bookId: BOOK_ID } }),
      { ...deps, store: broken },
    );

    expect(result.statusCode).toBe(500);
    expect(contractBody(ProblemDetails, result.body)).toMatchObject({
      type: 'urn:acme:problem:internal',
    });
    expect(logged).toEqual([failure]);
  });
});
