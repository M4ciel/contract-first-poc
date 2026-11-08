import type { AppConfigDataClient } from '@aws-sdk/client-appconfigdata';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { BookRepository, InMemoryBookRepository } from '@books/book.repository.js';
import { DynamoBookRepository } from '@books/dynamo-book.repository.js';
import { APPCONFIG_DATA } from '@cloud/aws-clients.js';
import { AppConfigFeatureFlags } from '@common/appconfig-feature-flags.js';
import { EnvFeatureFlags, FeatureFlags } from '@common/feature-flags.js';
import type { AppConfig } from '@config/app-config.js';
import { DynamoLoanRepository } from '@loans/dynamo-loan.repository.js';
import { InMemoryLoanRepository, LoanRepository } from '@loans/loan.repository.js';
import { fakeAwsClient } from '@testing/fake-aws-client.js';
import { createTestApp, testConfig } from '@testing/test-app.js';

/** The adapters are picked from the configuration, so `main.ts` never branches on environments. */
describe('AppModule adapters', () => {
  let app: NestFastifyApplication | undefined;
  afterEach(() => app?.close());

  it('keeps everything in memory when no AWS service is configured', async () => {
    app = await createTestApp();

    expect(app.get(BookRepository)).toBeInstanceOf(InMemoryBookRepository);
    expect(app.get(LoanRepository)).toBeInstanceOf(InMemoryLoanRepository);
    expect(app.get(FeatureFlags)).toBeInstanceOf(EnvFeatureFlags);
  });

  it('uses DynamoDB and AppConfig when they are configured', async () => {
    const config: AppConfig = {
      ...testConfig(),
      storage: { booksTable: 'books', loansTable: 'loans' },
      featureFlags: {
        source: 'appconfig',
        application: 'acme-library',
        environment: 'local',
        profile: 'feature-flags',
        pollIntervalSeconds: 15,
      },
      events: { busName: 'acme-library' },
    };
    const { client } = fakeAwsClient<AppConfigDataClient>([
      () => ({ InitialConfigurationToken: 't' }),
      () => ({}),
    ]);

    app = await createTestApp({ config, overrides: [[APPCONFIG_DATA, client]] });

    expect(app.get(BookRepository)).toBeInstanceOf(DynamoBookRepository);
    expect(app.get(LoanRepository)).toBeInstanceOf(DynamoLoanRepository);
    expect(app.get(FeatureFlags)).toBeInstanceOf(AppConfigFeatureFlags);
  });
});
