import { toLoan } from './loan.js';

describe('toLoan', () => {
  const loan = {
    id: '0b9d8c7e-6f5a-4b3c-8d2e-1a0f9e8d7c6b',
    bookId: '7c1e4b52-3f0a-4d8e-9b6a-1f2e3d4c5b6a',
    startedAt: new Date('2026-01-10T12:00:00Z'),
    dueAt: new Date('2026-01-24T12:00:00Z'),
  };
  const afterDue = new Date('2026-02-01T00:00:00Z');

  it('is overdue after the due date while not returned', () => {
    expect(toLoan(loan, afterDue).status).toBe('overdue');
  });

  it('is returned once returned, even after the due date', () => {
    expect(toLoan({ ...loan, returnedAt: afterDue }, afterDue).status).toBe('returned');
  });
});
