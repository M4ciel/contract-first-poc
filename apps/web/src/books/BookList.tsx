import { useBooleanFlagValue } from '@openfeature/react-sdk';
import { useState } from 'react';
import { ProblemAlert } from '@api/ProblemAlert.tsx';
import { FLAGS } from '@flags/flag-provider.ts';
import { useBookRows } from './use-book-rows.ts';

interface BookListProps {
  readonly onBorrow: (bookId: string) => void;
  readonly borrowingId: string | undefined;
}

export const BookList = ({ onBorrow, borrowingId }: BookListProps) => {
  // Cursors of the pages already visited, so "Previous" can go back (cursors are opaque).
  const [cursors, setCursors] = useState<readonly string[]>([]);
  // Behind a flag: the alpha `/v2/books` (a list of authors) replaces `/v1/books`.
  const useV2 = useBooleanFlagValue(FLAGS.booksV2, false);
  const books = useBookRows(useV2, cursors.at(-1));

  if (books.isPending) return <p className="muted">Loading books…</p>;
  if (books.isError) return <p role="alert">The book list could not be read.</p>;
  if (!books.data.ok) return <ProblemAlert problem={books.data.problem} />;

  const { version, rows, nextCursor } = books.data.value;
  return (
    <>
      {version === 'v2' && (
        <p className="tag" data-testid="catalog-version">
          Catalog v2 (alpha)
        </p>
      )}
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
          {rows.map((book) => (
            <tr key={book.id}>
              <td>{book.title}</td>
              <td>
                {book.authors.map((author) => (
                  <span key={author} className="author">
                    {author}
                  </span>
                ))}
              </td>
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
