import { type DynamicModule, Module, type Provider } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import {
  DYNAMODB,
  dynamoDbProvider,
  EVENTBRIDGE,
  eventBridgeProvider,
} from '@cloud/aws-clients.js';
import { BooksController } from '@books/books.controller.js';
import { BookRepository, InMemoryBookRepository, SEED_BOOKS } from '@books/book.repository.js';
import { DynamoBookRepository } from '@books/dynamo-book.repository.js';
import { Clock, SystemClock } from '@common/clock.js';
import { FeatureFlagGuard } from '@common/feature-flag.guard.js';
import { featureFlagsProvider } from '@common/feature-flags.factory.js';
import { APP_CONFIG, type AppConfig } from '@config/app-config.js';
import { EventPublisher, InMemoryEventPublisher } from '@events/event-publisher.js';
import { EventBridgeEventPublisher } from '@events/eventbridge-event-publisher.js';
import { HealthController } from '@health/health.controller.js';
import { InventoryGateway } from '@inventory/inventory.gateway.js';
import { DynamoLoanRepository } from '@loans/dynamo-loan.repository.js';
import { InMemoryLoanRepository, LoanRepository } from '@loans/loan.repository.js';
import { LoansController } from '@loans/loans.controller.js';
import { LoansService } from '@loans/loans.service.js';
import { ProblemDetailsFilter } from '@problems/problem-details.filter.js';

/**
 * Adapters are chosen once, from the configuration: AWS services and Flagsmith when they are
 * configured, in-memory ones otherwise. Nothing else in the application knows which one runs.
 */
const adapterProviders = (config: AppConfig): Provider[] => {
  const { booksTable, loansTable } = config.storage;
  const { busName } = config.events;
  const providers: Provider[] = [
    booksTable
      ? {
          provide: BookRepository,
          inject: [DYNAMODB],
          useFactory: (client: DynamoDBDocumentClient) =>
            new DynamoBookRepository(client, booksTable),
        }
      : { provide: BookRepository, useFactory: () => new InMemoryBookRepository(SEED_BOOKS) },
    loansTable
      ? {
          provide: LoanRepository,
          inject: [DYNAMODB],
          useFactory: (client: DynamoDBDocumentClient) =>
            new DynamoLoanRepository(client, loansTable),
        }
      : { provide: LoanRepository, useClass: InMemoryLoanRepository },
    busName
      ? {
          provide: EventPublisher,
          inject: [EVENTBRIDGE],
          useFactory: (client: EventBridgeClient) => new EventBridgeEventPublisher(client, busName),
        }
      : { provide: EventPublisher, useClass: InMemoryEventPublisher },
    featureFlagsProvider,
  ];
  if (booksTable || loansTable) providers.push(dynamoDbProvider);
  if (busName) providers.push(eventBridgeProvider);
  return providers;
};

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
        ...adapterProviders(config),
        FeatureFlagGuard,
        InventoryGateway,
        LoansService,
      ],
    };
  }
}
