import { readFileSync } from 'node:fs';
import path from 'node:path';
import { byCatalogOrder, InMemoryBookRepository, SEED_BOOKS } from './book.repository.js';

describe('SEED_BOOKS', () => {
  // Terraform seeds the DynamoDB tables from infra/terraform/seed/books.json. The in-memory catalog
  // used in tests and local development must be the same, or the two environments would disagree.
  it('matches the seed Terraform loads into DynamoDB', () => {
    const file = path.join(process.cwd(), '..', '..', 'infra', 'terraform', 'seed', 'books.json');
    const seed = JSON.parse(readFileSync(file, 'utf8')) as Array<Record<string, unknown>>;

    expect(
      SEED_BOOKS.map((book) => ({
        id: book.id,
        title: book.title,
        authors: book.authors,
        publishedAt: book.publishedAt.toISOString(),
        createdAt: book.createdAt.toISOString(),
      })),
    ).toEqual(
      seed.map((book) => {
        const { copies, ...rest } = book;
        expect(typeof copies).toBe('number');
        return rest;
      }),
    );
  });
});

describe('byCatalogOrder', () => {
  it('sorts oldest first, then by id', async () => {
    const at = new Date('2026-01-10T12:00:00Z');
    const later = new Date('2026-01-10T12:05:00Z');
    const book = (id: string, createdAt: Date) => ({
      id,
      title: id,
      authors: [],
      publishedAt: at,
      createdAt,
    });

    const books = await new InMemoryBookRepository([
      book('c', later),
      book('b', at),
      book('a', at),
    ]).findAll();

    expect(books.map((b) => b.id)).toEqual(['a', 'b', 'c']);
    expect([book('x', at), book('x', at)].sort(byCatalogOrder)).toHaveLength(2);
  });
});
