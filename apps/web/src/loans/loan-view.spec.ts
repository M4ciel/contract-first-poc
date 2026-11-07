import { formatDate, isPastDue, loanStatusBadge } from './loan-view.ts';

describe('loanStatusBadge', () => {
  it.each([
    ['active', 'On loan', 'info'],
    ['returned', 'Returned', 'success'],
    ['overdue', 'Overdue', 'danger'],
    ['unknown', 'Status unavailable', 'neutral'],
  ] as const)('shows %s as "%s" (%s)', (status, label, tone) => {
    expect(loanStatusBadge(status)).toEqual({ label, tone });
  });
});

describe('isPastDue', () => {
  const dueAt = '2026-03-15T12:00:00Z';

  it('uses the domain boundary: returning exactly at dueAt is on time', () => {
    expect(isPastDue({ status: 'active', dueAt }, new Date(dueAt))).toBe(false);
    expect(isPastDue({ status: 'active', dueAt }, new Date('2026-03-15T12:00:00.001Z'))).toBe(true);
  });

  it('warns for statuses this build does not know, but never for a returned book', () => {
    const later = new Date('2026-04-01T00:00:00Z');

    expect(isPastDue({ status: 'unknown', dueAt }, later)).toBe(true);
    expect(isPastDue({ status: 'returned', dueAt }, later)).toBe(false);
  });
});

describe('formatDate', () => {
  it('formats the UTC day, whatever the local time zone', () => {
    expect(formatDate('2026-03-15T23:30:00Z')).toBe('Mar 15, 2026');
  });
});
