import type { SQSBatchResponse, SQSRecord } from 'aws-lambda';
import { LoanCreatedV1Envelope } from './loan-created.js';
import type { ReminderStore } from './reminder-store.js';

export interface Logger {
  info(message: string): void;
  error(message: string): void;
}

/**
 * Handles a batch from the queue. Each record succeeds or fails on its own: failed message ids go
 * back in `batchItemFailures`, so only those are retried and, after `maxReceiveCount`, moved to
 * the dead-letter queue. An event that does not match `loan.created.v1` is a failure too: it lands
 * in the DLQ for someone to look at instead of being silently dropped.
 */
export const processRecords = async (
  records: readonly SQSRecord[],
  store: ReminderStore,
  log: Logger,
): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];
  for (const record of records) {
    try {
      const event = LoanCreatedV1Envelope.parse(JSON.parse(record.body));
      const added = await store.add({
        id: event.id,
        kind: 'loan-due',
        loanId: event.detail.loanId,
        bookId: event.detail.bookId,
        remindAt: event.detail.dueAt,
      });
      log.info(
        added
          ? `loan.created.v1 ${event.id}: reminder for loan ${event.detail.loanId} at ${event.detail.dueAt}`
          : `loan.created.v1 ${event.id}: already processed, skipped`,
      );
    } catch (error) {
      log.error(`message ${record.messageId} failed: ${String(error)}`);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures };
};
