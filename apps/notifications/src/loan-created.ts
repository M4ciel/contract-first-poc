import { z } from 'zod';

/**
 * `loan.created.v1` as EventBridge delivers it to the queue. Consumers are tolerant, like API
 * clients: fields they do not know are ignored. The event catalog (contracts/events) will own this
 * schema; until then it mirrors apps/api/src/events/loan-created.ts.
 */
export const LoanCreatedV1Envelope = z.object({
  id: z.string().min(1),
  source: z.literal('acme.library'),
  'detail-type': z.literal('loan.created.v1'),
  detail: z.object({
    loanId: z.uuid(),
    bookId: z.uuid(),
    startedAt: z.iso.datetime({ offset: true }),
    dueAt: z.iso.datetime({ offset: true }),
  }),
});

export type LoanCreatedV1Envelope = z.output<typeof LoanCreatedV1Envelope>;
