import { z } from 'zod';

/** Runtime configuration, read once from environment variables and validated at startup. */
export interface AppConfig {
  readonly port: number;
  readonly host: string;
  /** Base URL of the inventory service (API Gateway stage URL in AWS). */
  readonly inventoryBaseUrl: string;
  /** Timeout of each call to the inventory service, in milliseconds. */
  readonly inventoryTimeoutMs: number;
  /** Flag values when `featureFlags.source` is `env`. */
  readonly features: FeatureFlagValues;
  readonly featureFlags: FeatureFlagSource;
  /** DynamoDB tables. Without a table name, that repository is kept in memory (tests, local dev). */
  readonly storage: {
    readonly booksTable: string | undefined;
    readonly loansTable: string | undefined;
  };
  /** EventBridge bus for domain events. Without it, events stay in memory. */
  readonly events: { readonly busName: string | undefined };
}

export interface FeatureFlagValues {
  /** Exposes `GET /v2/books` (alpha). Off by default, as in production. */
  readonly booksV2: boolean;
}

export type FeatureFlagSource =
  | { readonly source: 'env' }
  | {
      readonly source: 'flagsmith';
      /** Flagsmith API, for example `http://flagsmith:8000/api/v1/`. */
      readonly apiUrl: string;
      /** Server-side environment key (`ser.…`): allows evaluating flags locally. */
      readonly serverKey: string;
      /** How often the environment is downloaded again, in seconds. */
      readonly refreshIntervalSeconds: number;
    };

export const APP_CONFIG = Symbol('APP_CONFIG');

const flag = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const optionalName = z.string().min(1).optional();

const EnvSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    HOST: z.string().min(1).default('0.0.0.0'),
    INVENTORY_BASE_URL: z.url(),
    INVENTORY_TIMEOUT_MS: z.coerce.number().int().min(1).default(2000),
    FEATURE_BOOKS_V2: flag,
    FEATURE_FLAGS_SOURCE: z.enum(['env', 'flagsmith']).default('env'),
    FLAGSMITH_API_URL: z.url().optional(),
    FLAGSMITH_SERVER_KEY: optionalName,
    FLAGSMITH_REFRESH_SECONDS: z.coerce.number().int().min(1).default(60),
    BOOKS_TABLE: optionalName,
    LOANS_TABLE: optionalName,
    EVENT_BUS_NAME: optionalName,
  })
  .superRefine((env, context) => {
    if (env.FEATURE_FLAGS_SOURCE !== 'flagsmith') return;
    for (const name of ['FLAGSMITH_API_URL', 'FLAGSMITH_SERVER_KEY'] as const) {
      if (!env[name]) {
        context.addIssue({
          code: 'custom',
          path: [name],
          message: 'Required when FEATURE_FLAGS_SOURCE is flagsmith',
        });
      }
    }
  });

/** Fails fast, listing every invalid variable, instead of starting with a broken configuration. */
export const loadConfig = (env: Record<string, string | undefined>): AppConfig => {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid configuration:\n- ${details.join('\n- ')}`);
  }
  const { data } = result;
  return {
    port: data.PORT,
    host: data.HOST,
    inventoryBaseUrl: data.INVENTORY_BASE_URL,
    inventoryTimeoutMs: data.INVENTORY_TIMEOUT_MS,
    features: { booksV2: data.FEATURE_BOOKS_V2 },
    featureFlags:
      data.FEATURE_FLAGS_SOURCE === 'flagsmith'
        ? {
            source: 'flagsmith',
            // Checked by superRefine above.
            apiUrl: data.FLAGSMITH_API_URL ?? '',
            serverKey: data.FLAGSMITH_SERVER_KEY ?? '',
            refreshIntervalSeconds: data.FLAGSMITH_REFRESH_SECONDS,
          }
        : { source: 'env' },
    storage: { booksTable: data.BOOKS_TABLE, loansTable: data.LOANS_TABLE },
    events: { busName: data.EVENT_BUS_NAME },
  };
};
