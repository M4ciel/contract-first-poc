import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { calculateDueDate } from '@acme/domain';
import { BookRepository } from '@books/book.repository.js';
import { Clock } from '@common/clock.js';
import { EventPublisher } from '@events/event-publisher.js';
import { loanCreatedV1 } from '@events/loan-created.js';
import { InventoryGateway } from '@inventory/inventory.gateway.js';
import { problems } from '@problems/problem.exception.js';
import type { LoanRecord } from './loan.js';
import { LoanRepository } from './loan.repository.js';

@Injectable()
export class LoansService {
  private readonly logger = new Logger(LoansService.name);

  constructor(
    private readonly books: BookRepository,
    private readonly loans: LoanRepository,
    private readonly inventory: InventoryGateway,
    private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  /**
   * Reserves a copy in the inventory service, records the loan with its due date and publishes
   * `loan.created.v1`. The loan is already saved when the event is published, so a publishing
   * failure is logged instead of failing the request. Guaranteed delivery would need an outbox
   * (see docs); this POC accepts the gap.
   */
  async create(bookId: string): Promise<LoanRecord> {
    if (!(await this.books.findById(bookId))) throw problems.bookNotFound(bookId);

    const id = randomUUID();
    const outcome = await this.inventory.reserve(bookId, id);
    if (outcome === 'book-not-found') throw problems.bookNotFound(bookId);
    if (outcome === 'unavailable') throw problems.bookUnavailable(bookId);

    const startedAt = this.clock.now();
    const loan: LoanRecord = { id, bookId, startedAt, dueAt: calculateDueDate(startedAt) };
    await this.loans.save(loan);
    try {
      await this.events.publish(loanCreatedV1(loan));
    } catch (error) {
      this.logger.error(`loan.created.v1 for loan ${loan.id} was not published: ${String(error)}`);
    }
    return loan;
  }

  async get(loanId: string): Promise<LoanRecord> {
    const loan = await this.loans.findById(loanId);
    if (!loan) throw problems.loanNotFound(loanId);
    return loan;
  }
}
