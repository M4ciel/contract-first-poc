import 'reflect-metadata';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { AppModule } from '#src/app.module.js';
import { Clock } from '#src/common/clock.js';
import type { AppConfig } from '#src/config/app-config.js';

/** `.test` is a reserved top-level domain: nothing real is ever called. */
export const INVENTORY_BASE_URL = 'http://inventory.test/local';

export const testConfig = (features: Partial<AppConfig['features']> = {}): AppConfig => ({
  port: 0,
  host: '127.0.0.1',
  inventoryBaseUrl: INVENTORY_BASE_URL,
  inventoryTimeoutMs: 200,
  features: { booksV2: false, ...features },
});

export class FixedClock extends Clock {
  constructor(public current: Date) {
    super();
  }

  override now(): Date {
    return new Date(this.current);
  }
}

/** The real application (same module as `main.ts`) with a controllable clock. */
export const createTestApp = async (
  options: { config?: AppConfig; clock?: Clock } = {},
): Promise<NestFastifyApplication> => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.forRoot(options.config ?? testConfig())],
  })
    .overrideProvider(Clock)
    .useValue(options.clock ?? new FixedClock(new Date('2026-01-10T12:00:00Z')))
    .compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
    logger: false,
  });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
};
