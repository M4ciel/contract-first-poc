/**
 * Loan rules shared by the backend (which sets `dueAt` when a loan is created) and the frontend
 * (which shows whether a loan is overdue). Both import these functions instead of
 * reimplementing them, so they cannot disagree.
 */

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export interface LoanPolicy {
  /** How long a book may be kept, in whole days. */
  readonly loanPeriodDays: number;
}

export const DEFAULT_LOAN_POLICY: LoanPolicy = Object.freeze({ loanPeriodDays: 14 });

const assertValidDate = (value: Date, name: string): void => {
  if (Number.isNaN(value.getTime())) {
    throw new RangeError(`${name} must be a valid date`);
  }
};

/**
 * When a loan started at `loanStartedAt` must be returned. Days are counted as fixed 24-hour
 * periods on the UTC timeline, so the result does not depend on the server's or the browser's
 * time zone (or on daylight saving changes).
 */
export const calculateDueDate = (
  loanStartedAt: Date,
  policy: LoanPolicy = DEFAULT_LOAN_POLICY,
): Date => {
  assertValidDate(loanStartedAt, 'loanStartedAt');
  if (!Number.isInteger(policy.loanPeriodDays) || policy.loanPeriodDays < 1) {
    throw new RangeError('loanPeriodDays must be a positive integer');
  }
  return new Date(loanStartedAt.getTime() + policy.loanPeriodDays * MILLISECONDS_PER_DAY);
};

/** A loan is overdue only after its due instant: returning it exactly at `dueAt` is on time. */
export const isLoanOverdue = (dueAt: Date, now: Date): boolean => {
  assertValidDate(dueAt, 'dueAt');
  assertValidDate(now, 'now');
  return now.getTime() > dueAt.getTime();
};
