// FROZEN copy of @acme/api-types@1.0.0 (tolerant: as published, after the tolerant-response post-processing).
// It simulates the code installed in an app that was never updated. Do not regenerate it.

import * as zod from 'zod';

export const Loan = zod
  .object({
    id: zod.uuid().describe('Loan identifier.'),
    bookId: zod.uuid().describe('Identifier of the borrowed book.'),
    status: zod
      .enum(['active', 'returned', 'overdue', 'unknown'])
      .catch('unknown')
      .describe(
        'Loan lifecycle status. New values may be added in the future; consumers receive `unknown`\nfor values they do not know yet.\n',
      ),
    startedAt: zod.iso
      .datetime({ offset: true })
      .describe('When the loan started, ISO 8601 with timezone.'),
    dueAt: zod.iso
      .datetime({ offset: true })
      .describe('When the book must be returned, ISO 8601 with timezone.'),
  })
  .describe('A book loan.');

export type Loan = zod.input<typeof Loan>;
export type LoanOutput = zod.output<typeof Loan>;
