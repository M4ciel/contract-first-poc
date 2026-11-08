import { useListBooks, useListBooksV2 } from '@acme/api-client';
import { selectV1Rows, selectV2Rows } from './book-rows.ts';

/**
 * One page of the catalog from `/v1/books` or, behind the booksV2 flag, `/v2/books` (alpha).
 * Both generated hooks are always called (React's rules of hooks); only the enabled one fetches.
 */
export const useBookRows = (useV2: boolean, cursor: string | undefined) => {
  const params = { limit: 5, ...(cursor ? { cursor } : {}) };
  const v1 = useListBooks(params, { query: { enabled: !useV2, select: selectV1Rows } });
  const v2 = useListBooksV2(params, { query: { enabled: useV2, select: selectV2Rows } });
  return useV2 ? v2 : v1;
};
