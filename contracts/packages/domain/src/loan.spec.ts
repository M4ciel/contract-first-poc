import { calculateDueDate, DEFAULT_LOAN_POLICY, isLoanOverdue } from './loan';

const at = (iso: string): Date => new Date(iso);
const invalid = new Date('not a date');

describe('calculateDueDate', () => {
  it('adds the default loan period of 14 days', () => {
    expect(DEFAULT_LOAN_POLICY).toEqual({ loanPeriodDays: 14 });
    expect(calculateDueDate(at('2026-01-10T12:00:00Z'))).toEqual(at('2026-01-24T12:00:00Z'));
  });

  it('uses the loan period of the given policy', () => {
    expect(calculateDueDate(at('2026-01-10T12:00:00Z'), { loanPeriodDays: 1 })).toEqual(
      at('2026-01-11T12:00:00Z'),
    );
    expect(calculateDueDate(at('2026-01-10T12:00:00Z'), { loanPeriodDays: 30 })).toEqual(
      at('2026-02-09T12:00:00Z'),
    );
  });

  it('counts fixed 24-hour days across month, year and daylight-saving boundaries', () => {
    expect(calculateDueDate(at('2026-12-25T23:30:00Z'))).toEqual(at('2027-01-08T23:30:00Z'));
    expect(calculateDueDate(at('2028-02-20T00:00:00Z'))).toEqual(at('2028-03-05T00:00:00Z'));
    // 2026-03-29 is a daylight-saving change in several time zones; UTC is not affected.
    expect(calculateDueDate(at('2026-03-20T10:00:00Z'))).toEqual(at('2026-04-03T10:00:00Z'));
  });

  it('keeps the time of day, including milliseconds', () => {
    expect(calculateDueDate(at('2026-01-10T08:15:30.123Z'))).toEqual(
      at('2026-01-24T08:15:30.123Z'),
    );
  });

  it('does not mutate the start date', () => {
    const startedAt = at('2026-01-10T12:00:00Z');
    calculateDueDate(startedAt);
    expect(startedAt).toEqual(at('2026-01-10T12:00:00Z'));
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects a loan period of %p days',
    (loanPeriodDays) => {
      expect(() => calculateDueDate(at('2026-01-10T12:00:00Z'), { loanPeriodDays })).toThrow(
        new RangeError('loanPeriodDays must be a positive integer'),
      );
    },
  );

  it('rejects an invalid start date', () => {
    expect(() => calculateDueDate(invalid)).toThrow(
      new RangeError('loanStartedAt must be a valid date'),
    );
  });
});

describe('isLoanOverdue', () => {
  const dueAt = at('2026-01-24T12:00:00Z');

  it('is not overdue before the due instant', () => {
    expect(isLoanOverdue(dueAt, at('2026-01-20T00:00:00Z'))).toBe(false);
    expect(isLoanOverdue(dueAt, at('2026-01-24T11:59:59.999Z'))).toBe(false);
  });

  it('is not overdue exactly at the due instant', () => {
    expect(isLoanOverdue(dueAt, at('2026-01-24T12:00:00Z'))).toBe(false);
  });

  it('is overdue one millisecond after the due instant', () => {
    expect(isLoanOverdue(dueAt, at('2026-01-24T12:00:00.001Z'))).toBe(true);
  });

  it('agrees with calculateDueDate', () => {
    const due = calculateDueDate(at('2026-01-10T12:00:00Z'));
    expect(isLoanOverdue(due, at('2026-01-25T12:00:00Z'))).toBe(true);
  });

  it('rejects invalid dates', () => {
    expect(() => isLoanOverdue(invalid, dueAt)).toThrow(
      new RangeError('dueAt must be a valid date'),
    );
    expect(() => isLoanOverdue(dueAt, invalid)).toThrow(new RangeError('now must be a valid date'));
  });
});
