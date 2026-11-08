import 'reflect-metadata';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { AppModule } from '@app/app.module.js';
import { Clock } from '@common/clock.js';
import type { AppConfig } from '@config/app-config.js';
import { EventPublisher, InMemoryEventPublisher } from '@events/event-publisher.js';

/** `.test` is a reserved top-level domain: nothing real is ever called. */
export const INVENTORY_BASE_URL = 'http://inventory.test/local';

export const testConfig = (features: Partial<AppConfig['features']> = {}): AppConfig => ({
  port: 0,
  host: '127.0.0.1',
  inventoryBaseUrl: INVENTORY_BASE_URL,
  inventoryTimeoutMs: 200,
  features: { booksV2: false, ...features },
  featureFlags: { source: 'env' },
  storage: { booksTable: undefined, loansTable: undefined },
  events: { busName: undefined },
});

export class FixedClock extends Clock {
  constructor(public current: Date) {
    super();
  }

  override now(): Date {
    return new Date(this.current);
  }
}

/**
 * The real application (same module as `main.ts`) with a controllable clock and, by default, an
 * in-memory event publisher the test can inspect. `overrides` replaces any other provider.
 */
export const createTestApp = async (
  options: {
    config?: AppConfig;
    clock?: Clock;
    events?: EventPublisher;
    overrides?: ReadonlyArray<readonly [token: unknown, value: unknown]>;
  } = {},
): Promise<NestFastifyApplication> => {
  let builder = Test.createTestingModule({
    imports: [AppModule.forRoot(options.config ?? testConfig())],
  })
    .overrideProvider(Clock)
    .useValue(options.clock ?? new FixedClock(new Date('2026-01-10T12:00:00Z')))
    .overrideProvider(EventPublisher)
    .useValue(options.events ?? new InMemoryEventPublisher());
  for (const [token, value] of options.overrides ?? []) {
    builder = builder.overrideProvider(token).useValue(value);
  }
  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
    logger: false,
  });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
};
