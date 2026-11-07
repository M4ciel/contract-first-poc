import type { LoanOutput } from '@acme/api-types';
import { formatDate, isPastDue, loanStatusBadge } from './loan-view.ts';

export const LoanCard = ({ loan }: { readonly loan: LoanOutput }) => {
  const badge = loanStatusBadge(loan.status);
  return (
    <article className="card" aria-label="Loan">
      <span className={`badge badge-${badge.tone}`} data-testid="loan-status">
        {badge.label}
      </span>
      <dl>
        <dt>Loan</dt>
        <dd className="mono">{loan.id}</dd>
        <dt>Borrowed</dt>
        <dd>{formatDate(loan.startedAt)}</dd>
        <dt>Return by</dt>
        <dd>
          {formatDate(loan.dueAt)}
          {isPastDue(loan, new Date()) && <span className="warning"> · Past due</span>}
        </dd>
      </dl>
    </article>
  );
};
