import { type DynamicModule, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { BooksController } from '@books/books.controller.js';
import { BookRepository, InMemoryBookRepository, SEED_BOOKS } from '@books/book.repository.js';
import { Clock, SystemClock } from '@common/clock.js';
import { FeatureFlagGuard } from '@common/feature-flag.guard.js';
import { EnvFeatureFlags, FeatureFlags } from '@common/feature-flags.js';
import { APP_CONFIG, type AppConfig } from '@config/app-config.js';
import { HealthController } from '@health/health.controller.js';
import { InventoryGateway } from '@inventory/inventory.gateway.js';
import { InMemoryLoanRepository, LoanRepository } from '@loans/loan.repository.js';
import { LoansController } from '@loans/loans.controller.js';
import { LoansService } from '@loans/loans.service.js';
import { ProblemDetailsFilter } from '@problems/problem-details.filter.js';

@Module({})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      controllers: [HealthController, BooksController, LoansController],
      providers: [
        { provide: APP_CONFIG, useValue: config },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
        { provide: Clock, useClass: SystemClock },
        { provide: FeatureFlags, useClass: EnvFeatureFlags },
        { provide: BookRepository, useFactory: () => new InMemoryBookRepository(SEED_BOOKS) },
        { provide: LoanRepository, useClass: InMemoryLoanRepository },
        FeatureFlagGuard,
        InventoryGateway,
        LoansService,
      ],
    };
  }
}
