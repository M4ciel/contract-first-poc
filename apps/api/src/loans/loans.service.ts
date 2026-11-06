import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { calculateDueDate } from '@acme/domain';
import { BookRepository } from '#src/books/book.repository.js';
import { Clock } from '#src/common/clock.js';
import { InventoryGateway } from '#src/inventory/inventory.gateway.js';
import { problems } from '#src/problems/problem.exception.js';
import type { LoanRecord } from './loan.js';
import { LoanRepository } from './loan.repository.js';

@Injectable()
export class LoansService {
  constructor(
    private readonly books: BookRepository,
    private readonly loans: LoanRepository,
    private readonly inventory: InventoryGateway,
    private readonly clock: Clock,
  ) {}

  /** Reserves a copy in the inventory service, then records the loan with its due date. */
  async create(bookId: string): Promise<LoanRecord> {
    if (!(await this.books.findById(bookId))) throw problems.bookNotFound(bookId);

    const id = randomUUID();
    const outcome = await this.inventory.reserve(bookId, id);
    if (outcome === 'book-not-found') throw problems.bookNotFound(bookId);
    if (outcome === 'unavailable') throw problems.bookUnavailable(bookId);

    const startedAt = this.clock.now();
    const loan: LoanRecord = { id, bookId, startedAt, dueAt: calculateDueDate(startedAt) };
    await this.loans.save(loan);
    return loan;
  }

  async get(loanId: string): Promise<LoanRecord> {
    const loan = await this.loans.findById(loanId);
    if (!loan) throw problems.loanNotFound(loanId);
    return loan;
  }
}
