import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import {
  BadRequestResponse,
  BookNotFoundResponse,
  BookUnavailableResponse,
  Loan,
  LoanNotFoundResponse,
  ServiceUnavailableResponse,
} from '@acme/api-types';
import { LOAN_CREATED_V1, LOAN_CREATED_V1_SOURCE, LoanCreatedV1 } from '@acme/events';
import { getCreateReservationResponseMock } from '@acme/inventory-client/mocks';
import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { EventPublisher, InMemoryEventPublisher } from '@events/event-publisher.js';
import { expectToMatchContract } from '@testing/contract.js';
import { createTestApp, FixedClock, INVENTORY_BASE_URL } from '@testing/test-app.js';

const BOOK_ID = '7c1e4b52-3f0a-4d8e-9b6a-1f2e3d4c5b6a';
const RESERVATIONS = `${INVENTORY_BASE_URL}/v1/reservations`;

interface ReservationRequest {
  readonly bookId: string;
  readonly loanId: string;
}

const problem = (type: string, status: number) =>
  HttpResponse.json({ type: `urn:acme:problem:${type}`, title: type, status }, { status });

// The inventory service is mocked at the network level, with data generated from its contract.
const reservations: ReservationRequest[] = [];
const inventory = setupServer(
  http.post(RESERVATIONS, async ({ request }) => {
    const body = (await request.json()) as ReservationRequest;
    reservations.push(body);
    return HttpResponse.json(
      { ...getCreateReservationResponseMock(), ...body, status: 'active' },
      { status: 201 },
    );
  }),
);

describe('loans', () => {
  const clock = new FixedClock(new Date('2026-01-10T12:00:00Z'));
  let app: NestFastifyApplication;

  beforeAll(async () => {
    inventory.listen({ onUnhandledFrame: 'error' });
    app = await createTestApp({ clock });
  });
  afterEach(() => {
    inventory.resetHandlers();
    reservations.length = 0;
    clock.current = new Date('2026-01-10T12:00:00Z');
  });
  afterAll(async () => {
    await app.close();
    inventory.close();
  });

  const createLoan = (payload: unknown) =>
    app.inject({ method: 'POST', url: '/v1/loans', payload: payload as object });

  describe('POST /v1/loans', () => {
    it('reserves a copy and creates the loan with the shared due date rule', async () => {
      const response = await createLoan({ bookId: BOOK_ID });
      const loan = response.json<Loan>();

      expect(response.statusCode).toBe(201);
      expect(response.headers.location).toBe(`/v1/loans/${loan.id}`);
      expect(loan).toEqual({
        id: expect.any(String),
        bookId: BOOK_ID,
        status: 'active',
        startedAt: '2026-01-10T12:00:00.000Z',
        dueAt: '2026-01-24T12:00:00.000Z',
      });
      expect(reservations).toEqual([{ bookId: BOOK_ID, loanId: loan.id }]);
      expectToMatchContract(Loan, loan);
    });

    it('publishes loan.created.v1 exactly as the event catalog defines it', async () => {
      const events = app.get(EventPublisher) as InMemoryEventPublisher;
      events.published.length = 0;

      const loan = (await createLoan({ bookId: BOOK_ID })).json<Loan>();

      // The exact (producer) schema generated from contracts/events/loan.created/v1.schema.json.
      expect(LoanCreatedV1.parse(events.published[0]?.data)).toEqual(events.published[0]?.data);
      expect(events.published).toEqual([
        {
          source: LOAN_CREATED_V1_SOURCE,
          type: LOAN_CREATED_V1,
          occurredAt: new Date('2026-01-10T12:00:00.000Z'),
          data: {
            loanId: loan.id,
            bookId: BOOK_ID,
            startedAt: '2026-01-10T12:00:00.000Z',
            dueAt: '2026-01-24T12:00:00.000Z',
          },
        },
      ]);
    });

    it('still creates the loan when the event cannot be published', async () => {
      const failing: EventPublisher = { publish: () => Promise.reject(new Error('bus is down')) };
      const other = await createTestApp({ clock, events: failing });
      try {
        const response = await other.inject({
          method: 'POST',
          url: '/v1/loans',
          payload: { bookId: BOOK_ID },
        });

        expect(response.statusCode).toBe(201);
        const loanId = response.json<Loan>().id;
        expect((await other.inject({ method: 'GET', url: `/v1/loans/${loanId}` })).statusCode).toBe(
          200,
        );
      } finally {
        await other.close();
      }
    });

    it.each([
      [{ bookId: BOOK_ID, extra: true }, '/extra'],
      [{}, '/bookId'],
      [{ bookId: 'not-a-uuid' }, '/bookId'],
    ])('rejects %j with a validation problem on %s', async (payload, pointer) => {
      const response = await createLoan(payload);

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        type: 'urn:acme:problem:validation',
        errors: [{ pointer }],
      });
      expectToMatchContract(BadRequestResponse, response.json());
      expect(reservations).toEqual([]);
    });

    it('rejects a malformed JSON body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/loans',
        headers: { 'content-type': 'application/json' },
        payload: '{"bookId":',
      });

      expect(response.statusCode).toBe(400);
      expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
      expect(response.json()).toMatchObject({ type: 'urn:acme:problem:validation' });
    });

    it('answers 404 book-not-found without calling the inventory for an unknown book', async () => {
      const response = await createLoan({ bookId: '0b9d8c7e-6f5a-4b3c-8d2e-1a0f9e8d7c6b' });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ type: 'urn:acme:problem:book-not-found' });
      expect(reservations).toEqual([]);
    });

    it('answers 409 book-unavailable when the inventory has no free copy', async () => {
      inventory.use(http.post(RESERVATIONS, () => problem('book-unavailable', 409)));

      const response = await createLoan({ bookId: BOOK_ID });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({ type: 'urn:acme:problem:book-unavailable' });
      expectToMatchContract(BookUnavailableResponse, response.json());
    });

    it('answers 404 book-not-found when the inventory does not know the book', async () => {
      inventory.use(http.post(RESERVATIONS, () => problem('book-not-found', 404)));

      const response = await createLoan({ bookId: BOOK_ID });

      expect(response.statusCode).toBe(404);
      expectToMatchContract(BookNotFoundResponse, response.json());
    });

    it('accepts an inventory response with fields and enum values it does not know yet', async () => {
      inventory.use(
        http.post(RESERVATIONS, async ({ request }) =>
          HttpResponse.json(
            {
              ...getCreateReservationResponseMock(),
              ...((await request.json()) as object),
              status: 'pending-pickup',
              pickupDeskId: 'desk-1',
            },
            { status: 201 },
          ),
        ),
      );

      expect((await createLoan({ bookId: BOOK_ID })).statusCode).toBe(201);
    });

    it.each([
      ['an error status', () => problem('service-unavailable', 503)],
      ['an undocumented status', () => new HttpResponse(null, { status: 418 })],
      ['a 201 that is not a reservation', () => HttpResponse.json({ ok: true }, { status: 201 })],
      ['a network error', () => HttpResponse.error()],
      [
        'a timeout',
        async () => {
          // Never answers: the gateway's timeout (200 ms in tests) must give up.
          await delay('infinite');
          return HttpResponse.json({}, { status: 201 });
        },
      ],
    ])('answers 503 service-unavailable on %s from the inventory', async (_case, resolver) => {
      inventory.use(http.post(RESERVATIONS, resolver));

      const response = await createLoan({ bookId: BOOK_ID });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toMatchObject({ type: 'urn:acme:problem:service-unavailable' });
      expectToMatchContract(ServiceUnavailableResponse, response.json());
    });
  });

  describe('GET /v1/loans/:loanId', () => {
    it('derives the status from the due date with the shared rule', async () => {
      const { id } = (await createLoan({ bookId: BOOK_ID })).json<Loan>();
      const getLoan = async () =>
        (await app.inject({ method: 'GET', url: `/v1/loans/${id}` })).json<Loan>();

      clock.current = new Date('2026-01-24T12:00:00Z');
      expect((await getLoan()).status).toBe('active');

      clock.current = new Date('2026-01-24T12:00:00.001Z');
      const overdue = await getLoan();
      expect(overdue.status).toBe('overdue');
      expectToMatchContract(Loan, overdue);
    });

    it('answers 404 loan-not-found for an unknown loan', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/loans/0b9d8c7e-6f5a-4b3c-8d2e-1a0f9e8d7c6b',
      });

      expect(response.statusCode).toBe(404);
      expectToMatchContract(LoanNotFoundResponse, response.json());
    });

    it('answers 400 for an id that is not a UUID', async () => {
      const response = await app.inject({ method: 'GET', url: '/v1/loans/42' });

      expect(response.json()).toMatchObject({ errors: [{ pointer: '#/path/loanId' }] });
    });
  });
});
