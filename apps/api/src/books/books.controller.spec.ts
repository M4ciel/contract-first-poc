import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import {
  BadRequestResponse,
  Book,
  BookNotFoundResponse,
  BookPage,
  BookV2Page,
  NotFoundResponse,
} from '@acme/api-types';
import { expectToMatchContract } from '#src/testing/contract.js';
import { createTestApp, testConfig } from '#src/testing/test-app.js';

const FIRST_BOOK_ID = '7c1e4b52-3f0a-4d8e-9b6a-1f2e3d4c5b6a';

describe('books', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(() => app.close());

  const get = (url: string) => app.inject({ method: 'GET', url });

  describe('GET /v1/books', () => {
    it('returns the first page with the default limit of 20', async () => {
      const response = await get('/v1/books');
      const page = response.json<BookPage>();

      expect(response.statusCode).toBe(200);
      expect(page.items).toHaveLength(20);
      expect(page.items[0]).toEqual({
        id: FIRST_BOOK_ID,
        title: 'Book title 1',
        author: 'Author name 1',
        publishedAt: '2001-01-15T00:00:00.000Z',
        createdAt: '2026-01-10T12:00:00.000Z',
      });
      expect(page.nextCursor).toEqual(expect.any(String));
      expectToMatchContract(BookPage, page);
    });

    it('follows nextCursor to the last page', async () => {
      const first = (await get('/v1/books?limit=10')).json<BookPage>();
      const second = (await get(`/v1/books?limit=10&cursor=${first.nextCursor}`)).json<BookPage>();
      const last = (await get(`/v1/books?limit=10&cursor=${second.nextCursor}`)).json<BookPage>();

      expect(second.items[0]?.title).toBe('Book title 11');
      expect(last.items.map((book) => book.title)).toHaveLength(5);
      expect(last.nextCursor).toBeNull();
    });

    it('joins several authors into the v1 author field', async () => {
      const page = (await get('/v1/books?limit=5')).json<BookPage>();

      expect(page.items[4]?.author).toBe('Author name 5, Author name 6');
    });

    it.each([
      ['/v1/books?limit=0', '#/query/limit'],
      ['/v1/books?limit=101', '#/query/limit'],
      ['/v1/books?limit=ten', '#/query/limit'],
      ['/v1/books?cursor=not-a-cursor', '#/query/cursor'],
      ['/v1/books?page=2', '#/query/page'],
    ])('rejects %s with a validation problem on %s', async (url, pointer) => {
      const response = await get(url);

      expect(response.statusCode).toBe(400);
      expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
      expect(response.json()).toMatchObject({
        type: 'urn:acme:problem:validation',
        errors: [{ pointer }],
      });
      expectToMatchContract(BadRequestResponse, response.json());
    });
  });

  describe('GET /v1/books/:bookId', () => {
    it('returns the book', async () => {
      const response = await get(`/v1/books/${FIRST_BOOK_ID}`);

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ id: FIRST_BOOK_ID, title: 'Book title 1' });
      expectToMatchContract(Book, response.json());
    });

    it('answers 404 book-not-found for an unknown id', async () => {
      const response = await get('/v1/books/0b9d8c7e-6f5a-4b3c-8d2e-1a0f9e8d7c6b');

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ type: 'urn:acme:problem:book-not-found' });
      expectToMatchContract(BookNotFoundResponse, response.json());
    });

    it('answers 400 for an id that is not a UUID', async () => {
      const response = await get('/v1/books/42');

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ errors: [{ pointer: '#/path/bookId' }] });
    });
  });

  describe('GET /v2/books (alpha, behind booksV2)', () => {
    it('does not exist while the flag is off, even for an invalid request', async () => {
      for (const url of ['/v2/books', '/v2/books?limit=0']) {
        const response = await get(url);

        expect(response.statusCode).toBe(404);
        expect(response.json()).toMatchObject({ type: 'urn:acme:problem:not-found' });
        expectToMatchContract(NotFoundResponse, response.json());
      }
    });

    it('returns books with an authors list when the flag is on', async () => {
      const v2 = await createTestApp({ config: testConfig({ booksV2: true }) });
      try {
        const response = await v2.inject({ method: 'GET', url: '/v2/books?limit=5' });
        const page = response.json<BookV2Page>();

        expect(response.statusCode).toBe(200);
        expect(page.items[4]?.authors).toEqual(['Author name 5', 'Author name 6']);
        expectToMatchContract(BookV2Page, page);
      } finally {
        await v2.close();
      }
    });
  });
});
