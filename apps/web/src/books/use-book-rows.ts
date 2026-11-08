import { useListBooks, useListBooksV2 } from '@acme/api-client';
import { BookPage, BookV2Page } from '@acme/api-types';
import { toApiResult } from '@api/api-result.ts';
import { type BookRows, fromV1, fromV2 } from './book-rows.ts';

/**
 * One page of the catalog from `/v1/books` or, behind the booksV2 flag, `/v2/books` (alpha).
 * Both generated hooks are always called (React's rules of hooks); only the enabled one fetches.
 */
export const useBookRows = (useV2: boolean, cursor: string | undefined) => {
  const params = { limit: 5, ...(cursor ? { cursor } : {}) };
  const v1 = useListBooks(params, {
    query: {
      enabled: !useV2,
      select: (response) => {
        const result = toApiResult(BookPage, 200, response);
        return result.ok ? { ok: true as const, value: fromV1(result.value) } : result;
      },
    },
  });
  const v2 = useListBooksV2(params, {
    query: {
      enabled: useV2,
      select: (response) => {
        const result = toApiResult(BookV2Page, 200, response);
        return result.ok ? { ok: true as const, value: fromV2(result.value) } : result;
      },
    },
  });
  return useV2 ? v2 : v1;
};

export type { BookRows };
