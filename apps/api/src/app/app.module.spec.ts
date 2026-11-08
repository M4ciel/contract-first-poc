import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { BookRepository, InMemoryBookRepository } from '@books/book.repository.js';
import { DynamoBookRepository } from '@books/dynamo-book.repository.js';
import { FeatureFlags, OpenFeatureFeatureFlags } from '@common/feature-flags.js';
import type { AppConfig } from '@config/app-config.js';
import { DynamoLoanRepository } from '@loans/dynamo-loan.repository.js';
import { InMemoryLoanRepository, LoanRepository } from '@loans/loan.repository.js';
import { createTestApp, testConfig } from '@testing/test-app.js';

/** The adapters are picked from the configuration, so `main.ts` never branches on environments. */
describe('AppModule adapters', () => {
  let app: NestFastifyApplication | undefined;
  afterEach(() => app?.close());

  it('keeps everything in memory when no AWS service is configured', async () => {
    app = await createTestApp();

    expect(app.get(BookRepository)).toBeInstanceOf(InMemoryBookRepository);
    expect(app.get(LoanRepository)).toBeInstanceOf(InMemoryLoanRepository);
    expect(app.get(FeatureFlags)).toBeInstanceOf(OpenFeatureFeatureFlags);
  });

  it('uses DynamoDB when the tables are configured', async () => {
    const config: AppConfig = {
      ...testConfig(),
      storage: { booksTable: 'books', loansTable: 'loans' },
      events: { busName: 'acme-library' },
    };

    app = await createTestApp({ config });

    expect(app.get(BookRepository)).toBeInstanceOf(DynamoBookRepository);
    expect(app.get(LoanRepository)).toBeInstanceOf(DynamoLoanRepository);
  });
});
