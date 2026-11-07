import { BookPage, Loan } from '@acme/api-types';
import { getGetLoanResponseMock, getListBooksResponseMock } from '@acme/api-client/mocks';
import { toApiResult, unexpectedProblem } from './api-result.ts';

describe('toApiResult', () => {
  it('parses a success body with the tolerant schema', () => {
    const body = getListBooksResponseMock();

    expect(toApiResult(BookPage, 200, { status: 200, data: body })).toEqual({
      ok: true,
      value: body,
    });
  });

  it('maps a status added after this build to unknown and drops new fields', () => {
    const body = { ...getGetLoanResponseMock(), status: 'lost', renewals: 2 };

    const result = toApiResult(Loan, 200, { status: 200, data: body });

    expect(result).toEqual({
      ok: true,
      value: { ...getLoanWithout(body, 'renewals'), status: 'unknown' },
    });
  });

  it('throws when a success body really breaks the contract', () => {
    const body = { ...getGetLoanResponseMock(), dueAt: 'tomorrow' };

    expect(() => toApiResult(Loan, 200, { status: 200, data: body })).toThrow();
  });

  it('returns the Problem Details of an error response', () => {
    const problem = {
      type: 'urn:acme:problem:book-unavailable',
      title: 'Book unavailable',
      status: 409,
      detail: 'No copy is free.',
    };

    expect(toApiResult(Loan, 201, { status: 409, data: problem })).toEqual({ ok: false, problem });
  });

  it('maps a problem type added after this build to unknown', () => {
    const problem = { type: 'urn:acme:problem:rate-limited', title: 'Slow down', status: 429 };

    expect(toApiResult(Loan, 201, { status: 429, data: problem })).toEqual({
      ok: false,
      problem: { ...problem, type: 'unknown' },
    });
  });

  it('falls back to a generic problem when the error body is not Problem Details', () => {
    expect(toApiResult(Loan, 201, { status: 502, data: {} })).toEqual({
      ok: false,
      problem: unexpectedProblem(502),
    });
  });
});

const getLoanWithout = (body: Record<string, unknown>, key: string) =>
  Object.fromEntries(Object.entries(body).filter(([name]) => name !== key));
