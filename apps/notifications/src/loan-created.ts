import { LOAN_CREATED_V1, LOAN_CREATED_V1_SOURCE, LoanCreatedV1Tolerant } from '@acme/events';
import { z } from 'zod';

/**
 * `loan.created.v1` as EventBridge delivers it to the queue. The payload (`detail`) is parsed with
 * the tolerant schema generated from the event catalog: fields this consumer does not know are
 * ignored, like API clients ignore new response fields.
 */
export const LoanCreatedV1Envelope = z.object({
  id: z.string().min(1),
  source: z.literal(LOAN_CREATED_V1_SOURCE),
  'detail-type': z.literal(LOAN_CREATED_V1),
  detail: LoanCreatedV1Tolerant,
});

export type LoanCreatedV1Envelope = z.output<typeof LoanCreatedV1Envelope>;
