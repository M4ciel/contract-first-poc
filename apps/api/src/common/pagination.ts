import { problems } from '@problems/problem.exception.js';

export interface Page<T> {
  readonly items: T[];
  readonly nextCursor: string | null;
}

// The cursor is opaque to clients: today it encodes an offset, and that can change freely.
const encode = (offset: number): string => Buffer.from(`offset:${offset}`).toString('base64url');

const decode = (cursor: string): number => {
  const match = /^offset:(\d+)$/.exec(Buffer.from(cursor, 'base64url').toString('utf8'));
  const offset = match ? Number(match[1]) : Number.NaN;
  if (!Number.isSafeInteger(offset)) {
    throw problems.validation([{ pointer: '#/query/cursor', detail: 'Invalid cursor.' }]);
  }
  return offset;
};

/** Cursor pagination over an ordered list. */
export const paginate = <T>(
  items: readonly T[],
  query: { readonly cursor?: string | undefined; readonly limit: number },
): Page<T> => {
  const start = query.cursor === undefined ? 0 : decode(query.cursor);
  const end = start + query.limit;
  return {
    items: items.slice(start, end),
    nextCursor: end < items.length ? encode(end) : null,
  };
};
