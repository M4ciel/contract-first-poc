import type { LoanOutput } from '@acme/api-types';
import { isLoanOverdue } from '@acme/domain';

export type BadgeTone = 'info' | 'success' | 'danger' | 'neutral';

export interface StatusBadge {
  readonly label: string;
  readonly tone: BadgeTone;
}

/**
 * `'unknown'` is a status the backend added after this build: the screen shows a neutral badge
 * instead of crashing or guessing.
 */
export const loanStatusBadge = (status: LoanOutput['status']): StatusBadge => {
  switch (status) {
    case 'active':
      return { label: 'On loan', tone: 'info' };
    case 'returned':
      return { label: 'Returned', tone: 'success' };
    case 'overdue':
      return { label: 'Overdue', tone: 'danger' };
    case 'unknown':
      return { label: 'Status unavailable', tone: 'neutral' };
  }
};

/**
 * Whether to warn that the return date has passed. It uses the same `isLoanOverdue` rule as the
 * backend, so both agree on the boundary (returning exactly at `dueAt` is on time).
 */
export const isPastDue = (loan: Pick<LoanOutput, 'status' | 'dueAt'>, now: Date): boolean =>
  loan.status !== 'returned' && isLoanOverdue(new Date(loan.dueAt), now);

export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso));
