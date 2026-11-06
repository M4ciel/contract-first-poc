import type { InvalidParam, ProblemDetails } from '@acme/api-types';

/**
 * An error the API reports to the client as RFC 9457 Problem Details. `type` must come from the
 * contract's problem type catalog, so clients can rely on it.
 */
export class ProblemException extends Error {
  constructor(readonly problem: ProblemDetails) {
    super(problem.detail ?? problem.title);
    this.name = 'ProblemException';
  }
}

/** Factories for every problem type the library API declares. */
export const problems = {
  validation: (errors: InvalidParam[]): ProblemException =>
    new ProblemException({
      type: 'urn:acme:problem:validation',
      title: 'Invalid request',
      status: 400,
      detail: `The request has ${errors.length} invalid field${errors.length === 1 ? '' : 's'}.`,
      errors,
    }),
  notFound: (): ProblemException =>
    new ProblemException({
      type: 'urn:acme:problem:not-found',
      title: 'Not found',
      status: 404,
      detail: 'The requested resource was not found.',
    }),
  bookNotFound: (bookId: string): ProblemException =>
    new ProblemException({
      type: 'urn:acme:problem:book-not-found',
      title: 'Book not found',
      status: 404,
      detail: `No book has the id ${bookId}.`,
    }),
  loanNotFound: (loanId: string): ProblemException =>
    new ProblemException({
      type: 'urn:acme:problem:loan-not-found',
      title: 'Loan not found',
      status: 404,
      detail: `No loan has the id ${loanId}.`,
    }),
  bookUnavailable: (bookId: string): ProblemException =>
    new ProblemException({
      type: 'urn:acme:problem:book-unavailable',
      title: 'Book unavailable',
      status: 409,
      detail: `All copies of the book ${bookId} are on loan.`,
    }),
  serviceUnavailable: (detail: string): ProblemException =>
    new ProblemException({
      type: 'urn:acme:problem:service-unavailable',
      title: 'Service unavailable',
      status: 503,
      detail,
    }),
};
