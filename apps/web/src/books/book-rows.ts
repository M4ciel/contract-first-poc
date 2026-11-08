import type { BookPageOutput, BookV2PageOutput } from '@acme/api-types';

/** What the table shows, whichever API version the page came from. */
export interface BookRow {
  readonly id: string;
  readonly title: string;
  readonly authors: readonly string[];
}

export interface BookRows {
  readonly version: 'v1' | 'v2';
  readonly rows: readonly BookRow[];
  readonly nextCursor: string | null;
}

/** v1 has one `author` string (several authors already joined by the backend). */
export const fromV1 = (page: BookPageOutput): BookRows => ({
  version: 'v1',
  rows: page.items.map((book) => ({ id: book.id, title: book.title, authors: [book.author] })),
  nextCursor: page.nextCursor,
});

/** v2 (alpha) has the `authors` list. */
export const fromV2 = (page: BookV2PageOutput): BookRows => ({
  version: 'v2',
  rows: page.items.map((book) => ({ id: book.id, title: book.title, authors: book.authors })),
  nextCursor: page.nextCursor,
});
