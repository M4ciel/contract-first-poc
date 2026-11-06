import type { LoanOutput } from './frozen/tolerant/loan.js';

/**
 * UI logic of the old app. It was written for the statuses of API 1.0.0, plus the `unknown`
 * fallback the tolerant schemas guarantee: a status added later shows a neutral label instead of
 * crashing the screen.
 */
export const loanStatusLabel = (status: LoanOutput['status']): string => {
  switch (status) {
    case 'active':
      return 'On loan';
    case 'returned':
      return 'Returned';
    case 'overdue':
      return 'Overdue';
    case 'unknown':
      return 'Status unavailable';
  }
};
