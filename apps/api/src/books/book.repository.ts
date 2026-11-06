import type { BookRecord } from './book.js';

/** Catalog storage. In memory for now; DynamoDB comes with the infrastructure step. */
export abstract class BookRepository {
  /** All books, in a stable order (pagination depends on it). */
  abstract findAll(): Promise<readonly BookRecord[]>;
  abstract findById(id: string): Promise<BookRecord | undefined>;
}

/** Fictional catalog: the first id matches the examples in the contract. */
export const SEED_BOOKS: readonly BookRecord[] = Array.from({ length: 25 }, (_, index) => {
  const n = index + 1;
  return {
    id:
      n === 1
        ? '7c1e4b52-3f0a-4d8e-9b6a-1f2e3d4c5b6a'
        : `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    title: `Book title ${n}`,
    authors: n % 5 === 0 ? [`Author name ${n}`, `Author name ${n + 1}`] : [`Author name ${n}`],
    publishedAt: new Date(Date.UTC(2000 + (n % 25), 0, 15)),
    createdAt: new Date('2026-01-10T12:00:00Z'),
  };
});

/** Built with a factory (see AppModule), so it takes its data instead of injected providers. */
export class InMemoryBookRepository extends BookRepository {
  constructor(private readonly books: readonly BookRecord[]) {
    super();
  }

  override findAll(): Promise<readonly BookRecord[]> {
    return Promise.resolve(this.books);
  }

  override findById(id: string): Promise<BookRecord | undefined> {
    return Promise.resolve(this.books.find((book) => book.id === id));
  }
}
