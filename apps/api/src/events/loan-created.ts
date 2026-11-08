import { LOAN_CREATED_V1, LOAN_CREATED_V1_SOURCE, type LoanCreatedV1 } from '@acme/events';
import type { LoanRecord } from '@loans/loan.js';
import type { DomainEvent } from './event-publisher.js';

/** `loan.created.v1` from contracts/events/loan.created.v1.json: identifiers and dates only. */
export const loanCreatedV1 = (loan: LoanRecord): DomainEvent<LoanCreatedV1> => ({
  source: LOAN_CREATED_V1_SOURCE,
  type: LOAN_CREATED_V1,
  occurredAt: loan.startedAt,
  data: {
    loanId: loan.id,
    bookId: loan.bookId,
    startedAt: loan.startedAt.toISOString(),
    dueAt: loan.dueAt.toISOString(),
  },
});
