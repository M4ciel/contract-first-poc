import { Injectable } from '@nestjs/common';
import type { LoanRecord } from './loan.js';

/** Loan storage: DynamoDB (dynamo-loan.repository.ts) or memory (tests, local development). */
export abstract class LoanRepository {
  abstract save(loan: LoanRecord): Promise<void>;
  abstract findById(id: string): Promise<LoanRecord | undefined>;
}

@Injectable()
export class InMemoryLoanRepository extends LoanRepository {
  private readonly loans = new Map<string, LoanRecord>();

  override save(loan: LoanRecord): Promise<void> {
    this.loans.set(loan.id, loan);
    return Promise.resolve();
  }

  override findById(id: string): Promise<LoanRecord | undefined> {
    return Promise.resolve(this.loans.get(id));
  }
}
