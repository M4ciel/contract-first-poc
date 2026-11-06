import {
  getCreateLoanResponseMock,
  getGetLoanResponseMock,
  getListBooksResponseMock,
} from '@acme/api-client/mocks';
import { ZodError } from 'zod';
import { BookPage } from './frozen/tolerant/book-page.js';
import { Loan } from './frozen/tolerant/loan.js';
import { ProblemDetails } from './frozen/tolerant/problem-details.js';
import { BookPage as StrictBookPage } from './frozen/strict/book-page.js';
import { Loan as StrictLoan } from './frozen/strict/loan.js';
import { ProblemDetails as StrictProblemDetails } from './frozen/strict/problem-details.js';
import { loanStatusLabel } from './loan-status.js';

// A response from a newer server: same loan, plus what the contract added since 1.0.0.
const loanFromNewerServer = {
  id: '0b9d8c7e-6f5a-4b3c-8d2e-1a0f9e8d7c6b',
  bookId: '7c1e4b52-3f0a-4d8e-9b6a-1f2e3d4c5b6a',
  status: 'active',
  startedAt: '2026-01-10T12:00:00Z',
  dueAt: '2026-01-24T12:00:00Z',
};

describe('an app still on @acme/api-types@1.0.0', () => {
  describe('with the published (tolerant) schemas', () => {
    it('accepts a response with a field it does not know, and drops it', () => {
      const loan = Loan.parse({ ...loanFromNewerServer, renewals: 2 });

      expect(loan).toEqual(loanFromNewerServer);
    });

    it('reads a new enum value as unknown and shows a neutral label', () => {
      const loan = Loan.parse({ ...loanFromNewerServer, status: 'lost' });

      expect(loan.status).toBe('unknown');
      expect(loanStatusLabel(loan.status)).toBe('Status unavailable');
    });

    it('reads a problem type added after 1.0.0 as unknown', () => {
      const problem = ProblemDetails.parse({
        type: 'urn:acme:problem:internal',
        title: 'Internal server error',
        status: 500,
      });

      expect(problem.type).toBe('unknown');
      expect(problem.title).toBe('Internal server error');
    });

    it('applies the same tolerance to nested objects', () => {
      const page = BookPage.parse({
        items: [
          {
            id: '7c1e4b52-3f0a-4d8e-9b6a-1f2e3d4c5b6a',
            title: 'Book title 1',
            author: 'Author name 1',
            publishedAt: '2001-01-15T00:00:00Z',
            createdAt: '2026-01-10T12:00:00Z',
            isbn: '000-0-00-000000-0',
          },
        ],
        nextCursor: null,
        totalItems: 1,
      });

      expect(page.items[0]).not.toHaveProperty('isbn');
      expect(page).not.toHaveProperty('totalItems');
    });

    it('still rejects a response that breaks the contract', () => {
      expect(() => Loan.parse({ ...loanFromNewerServer, dueAt: 'tomorrow' })).toThrow(ZodError);
    });
  });

  describe('without the post-processing (what Orval emits on its own)', () => {
    it('breaks on a field it does not know', () => {
      expect(() => StrictLoan.parse({ ...loanFromNewerServer, renewals: 2 })).toThrow(ZodError);
      expect(() => StrictBookPage.parse({ items: [], nextCursor: null, totalItems: 0 })).toThrow(
        ZodError,
      );
    });

    it('breaks on a new enum value', () => {
      expect(() => StrictLoan.parse({ ...loanFromNewerServer, status: 'lost' })).toThrow(ZodError);
      expect(() =>
        StrictProblemDetails.parse({ type: 'urn:acme:problem:internal', title: 'x', status: 500 }),
      ).toThrow(ZodError);
    });
  });

  // Every response the *current* contract can produce (generated mocks, random data) must stay
  // readable by the old app. A breaking change in the contract makes this fail.
  describe('against responses of the current contract', () => {
    it.each(Array.from({ length: 50 }, (_, run) => run))('run %i', () => {
      expect(() => Loan.parse(getGetLoanResponseMock())).not.toThrow();
      expect(() => Loan.parse(getCreateLoanResponseMock())).not.toThrow();
      expect(() => BookPage.parse(getListBooksResponseMock())).not.toThrow();
    });
  });
});
