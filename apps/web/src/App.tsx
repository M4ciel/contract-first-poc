import { useCreateLoan } from '@acme/api-client';
import { Loan, type LoanOutput } from '@acme/api-types';
import { useState } from 'react';
import { toApiResult, type ApiResult } from './api/api-result.ts';
import { ProblemAlert } from './api/ProblemAlert.tsx';
import { BookList } from './books/BookList.tsx';
import { LoanCard } from './loans/LoanCard.tsx';
import { LoanLookup } from './loans/LoanLookup.tsx';

export const App = ({ mockMode }: { readonly mockMode: boolean }) => {
  const createLoan = useCreateLoan();
  const [borrowed, setBorrowed] = useState<ApiResult<LoanOutput> | undefined>();

  const borrow = (bookId: string) => {
    setBorrowed(undefined);
    createLoan.mutate(
      { data: { bookId } },
      { onSuccess: (response) => setBorrowed(toApiResult(Loan, 201, response)) },
    );
  };

  return (
    <div className="page">
      <header className="header">
        <h1>Acme Library</h1>
        {mockMode && <span className="tag">Mock data</span>}
      </header>

      <main className="layout">
        <section aria-labelledby="books-heading">
          <h2 id="books-heading">Books</h2>
          <BookList
            onBorrow={borrow}
            borrowingId={createLoan.isPending ? createLoan.variables.data.bookId : undefined}
          />
        </section>

        <section aria-labelledby="loan-heading">
          <h2 id="loan-heading">Your loan</h2>
          {createLoan.isError && <p role="alert">The loan could not be read.</p>}
          {borrowed?.ok === true && <LoanCard loan={borrowed.value} />}
          {borrowed?.ok === false && <ProblemAlert problem={borrowed.problem} />}
          {!borrowed && !createLoan.isError && (
            <p className="muted">Borrow a book to see the loan here.</p>
          )}
          <LoanLookup />
        </section>
      </main>
    </div>
  );
};
