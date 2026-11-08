import { BookPage, type BookPageOutput, BookV2Page, type BookV2PageOutput } from '@acme/api-types';
import { type ApiResult, type RawResponse, toApiResult } from '@api/api-result.ts';

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

const mapResult = <T>(result: ApiResult<T>, map: (value: T) => BookRows): ApiResult<BookRows> =>
  result.ok ? { ok: true, value: map(result.value) } : result;

/** `select` of the generated v1 hook: tolerant parse, then rows. */
export const selectV1Rows = (response: RawResponse): ApiResult<BookRows> =>
  mapResult(toApiResult(BookPage, 200, response), fromV1);

/** `select` of the generated v2 hook: tolerant parse, then rows. */
export const selectV2Rows = (response: RawResponse): ApiResult<BookRows> =>
  mapResult(toApiResult(BookV2Page, 200, response), fromV2);
