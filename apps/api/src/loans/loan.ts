import type { Loan } from '@acme/api-types';
import { isLoanOverdue } from '@acme/domain';

export interface LoanRecord {
  readonly id: string;
  readonly bookId: string;
  readonly startedAt: Date;
  readonly dueAt: Date;
  readonly returnedAt?: Date;
}

/** `status` is derived when read, with the shared `@acme/domain` rule the frontend also uses. */
export const toLoan = (loan: LoanRecord, now: Date): Loan => ({
  id: loan.id,
  bookId: loan.bookId,
  status: loan.returnedAt ? 'returned' : isLoanOverdue(loan.dueAt, now) ? 'overdue' : 'active',
  startedAt: loan.startedAt.toISOString(),
  dueAt: loan.dueAt.toISOString(),
});
