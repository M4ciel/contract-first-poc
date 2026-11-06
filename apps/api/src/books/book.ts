import type { Book, BookV2 } from '@acme/api-types';

/** A catalog book as the backend stores it. Both API versions are views of this record. */
export interface BookRecord {
  readonly id: string;
  readonly title: string;
  readonly authors: readonly string[];
  readonly publishedAt: Date;
  readonly createdAt: Date;
}

/** v1 has a single `author` string, so several authors are joined. */
export const toBookV1 = (book: BookRecord): Book => ({
  id: book.id,
  title: book.title,
  author: book.authors.join(', '),
  publishedAt: book.publishedAt.toISOString(),
  createdAt: book.createdAt.toISOString(),
});

export const toBookV2 = (book: BookRecord): BookV2 => ({
  id: book.id,
  title: book.title,
  authors: [...book.authors],
  publishedAt: book.publishedAt.toISOString(),
  createdAt: book.createdAt.toISOString(),
});
