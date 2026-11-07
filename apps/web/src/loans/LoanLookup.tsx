import { useGetLoan } from '@acme/api-client';
import { Loan } from '@acme/api-types';
import { useState, type FormEvent } from 'react';
import { toApiResult } from '#src/api/api-result.ts';
import { ProblemAlert } from '#src/api/ProblemAlert.tsx';
import { LoanCard } from './LoanCard.tsx';

export const LoanLookup = () => {
  const [draft, setDraft] = useState('');
  const [loanId, setLoanId] = useState('');
  const loan = useGetLoan(loanId, {
    query: { enabled: loanId !== '', select: (response) => toApiResult(Loan, 200, response) },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setLoanId(draft.trim());
  };

  return (
    <div className="lookup">
      <form onSubmit={submit} className="lookup-form">
        <label htmlFor="loan-id">Find a loan</label>
        <input
          id="loan-id"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Loan id"
        />
        <button type="submit">Find</button>
      </form>
      {loan.isFetching && <p className="muted">Loading…</p>}
      {loan.isError && <p role="alert">The loan could not be read.</p>}
      {loan.data?.ok === true && <LoanCard loan={loan.data.value} />}
      {loan.data?.ok === false && <ProblemAlert problem={loan.data.problem} />}
    </div>
  );
};
