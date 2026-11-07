import { useListBooks } from '@acme/api-client';
import { BookPage } from '@acme/api-types';
import { useState } from 'react';
import { toApiResult } from '#src/api/api-result.ts';
import { ProblemAlert } from '#src/api/ProblemAlert.tsx';

const PAGE_SIZE = 5;

interface BookListProps {
  readonly onBorrow: (bookId: string) => void;
  readonly borrowingId: string | undefined;
}

export const BookList = ({ onBorrow, borrowingId }: BookListProps) => {
  // Cursors of the pages already visited, so "Previous" can go back (cursors are opaque).
  const [cursors, setCursors] = useState<readonly string[]>([]);
  const cursor = cursors.at(-1);
  const books = useListBooks(
    { limit: PAGE_SIZE, ...(cursor ? { cursor } : {}) },
    { query: { select: (response) => toApiResult(BookPage, 200, response) } },
  );

  if (books.isPending) return <p className="muted">Loading books…</p>;
  if (books.isError) return <p role="alert">The book list could not be read.</p>;
  if (!books.data.ok) return <ProblemAlert problem={books.data.problem} />;

  const { items, nextCursor } = books.data.value;
  return (
    <>
      <table className="books">
        <thead>
          <tr>
            <th scope="col">Title</th>
            <th scope="col">Author</th>
            <th scope="col">
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((book) => (
            <tr key={book.id}>
              <td>{book.title}</td>
              <td>{book.author}</td>
              <td>
                <button
                  type="button"
                  onClick={() => onBorrow(book.id)}
                  disabled={borrowingId !== undefined}
                  aria-label={`Borrow ${book.title}`}
                >
                  {borrowingId === book.id ? 'Borrowing…' : 'Borrow'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <nav className="pager" aria-label="Book pages">
        <button
          type="button"
          disabled={cursors.length === 0}
          onClick={() => setCursors(cursors.slice(0, -1))}
        >
          Previous
        </button>
        <button
          type="button"
          disabled={nextCursor === null}
          onClick={() => nextCursor && setCursors([...cursors, nextCursor])}
        >
          Next
        </button>
      </nav>
    </>
  );
};
