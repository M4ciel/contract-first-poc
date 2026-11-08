import { getListBooksResponseMock, getListBooksV2ResponseMock } from '@acme/api-client/mocks';
import { fromV1, fromV2 } from './book-rows.ts';

describe('book rows', () => {
  it('shows the single v1 author string as one author', () => {
    const page = getListBooksResponseMock({ nextCursor: 'next' });

    const rows = fromV1(page);

    expect(rows.version).toBe('v1');
    expect(rows.nextCursor).toBe('next');
    expect(rows.rows[0]).toEqual({
      id: page.items[0]?.id,
      title: page.items[0]?.title,
      authors: [page.items[0]?.author],
    });
  });

  it('keeps the v2 authors list', () => {
    const page = getListBooksV2ResponseMock({ nextCursor: null });

    const rows = fromV2(page);

    expect(rows.version).toBe('v2');
    expect(rows.nextCursor).toBeNull();
    expect(rows.rows[0]?.authors).toEqual(page.items[0]?.authors);
  });
});
