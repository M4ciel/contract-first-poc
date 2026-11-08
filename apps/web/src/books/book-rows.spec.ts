import { getListBooksResponseMock, getListBooksV2ResponseMock } from '@acme/api-client/mocks';
import { fromV1, fromV2, selectV1Rows, selectV2Rows } from './book-rows.ts';

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

describe('selecting rows from a response', () => {
  it('parses each version with its tolerant schema', () => {
    const v1 = getListBooksResponseMock();
    const v2 = getListBooksV2ResponseMock();

    expect(selectV1Rows({ status: 200, data: v1 })).toEqual({ ok: true, value: fromV1(v1) });
    expect(selectV2Rows({ status: 200, data: v2 })).toEqual({ ok: true, value: fromV2(v2) });
  });

  it('passes problems through', () => {
    const problem = { type: 'urn:acme:problem:not-found', title: 'Not found', status: 404 };

    expect(selectV2Rows({ status: 404, data: problem })).toEqual({ ok: false, problem });
    expect(selectV1Rows({ status: 404, data: problem })).toEqual({ ok: false, problem });
  });
});
