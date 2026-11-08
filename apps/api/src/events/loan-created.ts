import type { LoanRecord } from '@loans/loan.js';
import type { DomainEvent } from './event-publisher.js';

export const LOAN_CREATED_V1 = 'loan.created.v1';

/** `loan.created.v1`: identifiers and dates only, no personal data. */
export interface LoanCreatedV1 {
  readonly loanId: string;
  readonly bookId: string;
  readonly startedAt: string;
  readonly dueAt: string;
}

export const loanCreatedV1 = (loan: LoanRecord): DomainEvent<LoanCreatedV1> => ({
  type: LOAN_CREATED_V1,
  occurredAt: loan.startedAt,
  data: {
    loanId: loan.id,
    bookId: loan.bookId,
    startedAt: loan.startedAt.toISOString(),
    dueAt: loan.dueAt.toISOString(),
  },
});
