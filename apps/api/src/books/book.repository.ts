import type { BookRecord } from './book.js';

/** Catalog storage: DynamoDB (dynamo-book.repository.ts) or memory (tests, local development). */
export abstract class BookRepository {
  /** All books in catalog order (see `byCatalogOrder`); pagination depends on it. */
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
    // One minute apart, so the catalog order (oldest first) is the seed order.
    createdAt: new Date(Date.UTC(2026, 0, 10, 12, n - 1)),
  };
});

/** Oldest first, then by id: the same order in every storage, so cursors stay valid. */
export const byCatalogOrder = (a: BookRecord, b: BookRecord): number =>
  a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id);

/** Built with a factory (see AppModule), so it takes its data instead of injected providers. */
export class InMemoryBookRepository extends BookRepository {
  private readonly books: readonly BookRecord[];

  constructor(books: readonly BookRecord[]) {
    super();
    this.books = [...books].sort(byCatalogOrder);
  }

  override findAll(): Promise<readonly BookRecord[]> {
    return Promise.resolve(this.books);
  }

  override findById(id: string): Promise<BookRecord | undefined> {
    return Promise.resolve(this.books.find((book) => book.id === id));
  }
}
