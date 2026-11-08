import type { SQSRecord } from 'aws-lambda';
import { processRecords } from './process-records.js';
import type { Reminder, ReminderStore } from './reminder-store.js';

const LOAN_ID = '0b9d8c7e-6f5a-4b3c-8d2e-1a0f9e8d7c6b';
const BOOK_ID = '7c1e4b52-3f0a-4d8e-9b6a-1f2e3d4c5b6a';

const envelope = (overrides: Record<string, unknown> = {}) => ({
  version: '0',
  id: 'event-1',
  source: 'acme.library',
  'detail-type': 'loan.created.v1',
  time: '2026-01-10T12:00:00Z',
  detail: {
    loanId: LOAN_ID,
    bookId: BOOK_ID,
    startedAt: '2026-01-10T12:00:00.000Z',
    dueAt: '2026-01-24T12:00:00.000Z',
  },
  ...overrides,
});

const record = (messageId: string, body: unknown) =>
  ({ messageId, body: typeof body === 'string' ? body : JSON.stringify(body) }) as SQSRecord;

class MemoryStore implements ReminderStore {
  readonly reminders = new Map<string, Reminder>();
  add(reminder: Reminder): Promise<boolean> {
    if (this.reminders.has(reminder.id)) return Promise.resolve(false);
    this.reminders.set(reminder.id, reminder);
    return Promise.resolve(true);
  }
}

const logs = () => {
  const lines: string[] = [];
  return {
    lines,
    log: { info: (m: string) => lines.push(m), error: (m: string) => lines.push(m) },
  };
};

describe('processRecords', () => {
  it('schedules a reminder for the due date of the loan', async () => {
    const store = new MemoryStore();
    const { log, lines } = logs();

    const result = await processRecords([record('m1', envelope())], store, log);

    expect(result).toEqual({ batchItemFailures: [] });
    expect(store.reminders.get('event-1')).toEqual({
      id: 'event-1',
      kind: 'loan-due',
      loanId: LOAN_ID,
      bookId: BOOK_ID,
      remindAt: '2026-01-24T12:00:00.000Z',
    });
    expect(lines).toEqual([
      `loan.created.v1 event-1: reminder for loan ${LOAN_ID} at 2026-01-24T12:00:00.000Z`,
    ]);
  });

  it('ignores fields it does not know (tolerant consumer)', async () => {
    const store = new MemoryStore();
    const event = envelope({ detail: { ...envelope().detail, branch: 'north' }, region: 'x' });

    const result = await processRecords([record('m1', event)], store, logs().log);

    expect(result.batchItemFailures).toEqual([]);
    expect(store.reminders.size).toBe(1);
  });

  it('stores a redelivered event once', async () => {
    const store = new MemoryStore();
    const { log, lines } = logs();

    await processRecords([record('m1', envelope()), record('m2', envelope())], store, log);

    expect(store.reminders.size).toBe(1);
    expect(lines[1]).toBe('loan.created.v1 event-1: already processed, skipped');
  });

  it('reports only the failed messages, so the rest of the batch is not retried', async () => {
    const store = new MemoryStore();

    const result = await processRecords(
      [
        record('bad-json', '{oops'),
        record('wrong-type', envelope({ 'detail-type': 'loan.returned.v1' })),
        record('invalid-detail', envelope({ detail: { loanId: 'nope' } })),
        record('good', envelope({ id: 'event-2' })),
      ],
      store,
      logs().log,
    );

    expect(result.batchItemFailures).toEqual([
      { itemIdentifier: 'bad-json' },
      { itemIdentifier: 'wrong-type' },
      { itemIdentifier: 'invalid-detail' },
    ]);
    expect([...store.reminders.keys()]).toEqual(['event-2']);
  });

  it('reports a message whose reminder cannot be stored', async () => {
    const failing: ReminderStore = { add: () => Promise.reject(new Error('throttled')) };
    const { log, lines } = logs();

    const result = await processRecords([record('m1', envelope())], failing, log);

    expect(result.batchItemFailures).toEqual([{ itemIdentifier: 'm1' }]);
    expect(lines).toEqual(['message m1 failed: Error: throttled']);
  });
});
