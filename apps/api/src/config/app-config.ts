import { z } from 'zod';

/** Runtime configuration, read once from environment variables and validated at startup. */
export interface AppConfig {
  readonly port: number;
  readonly host: string;
  /** Base URL of the inventory service (API Gateway stage URL in AWS). */
  readonly inventoryBaseUrl: string;
  /** Timeout of each call to the inventory service, in milliseconds. */
  readonly inventoryTimeoutMs: number;
  /** Values used when `featureFlags.source` is `env`. */
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
      readonly source: 'appconfig';
      readonly application: string;
      readonly environment: string;
      readonly profile: string;
      /** How often AppConfig is polled for a new deployment (AppConfig's minimum is 15 s). */
      readonly pollIntervalSeconds: number;
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
    FEATURE_FLAGS_SOURCE: z.enum(['env', 'appconfig']).default('env'),
    APPCONFIG_APPLICATION: optionalName,
    APPCONFIG_ENVIRONMENT: optionalName,
    APPCONFIG_PROFILE: optionalName,
    APPCONFIG_POLL_INTERVAL_SECONDS: z.coerce.number().int().min(15).default(15),
    BOOKS_TABLE: optionalName,
    LOANS_TABLE: optionalName,
    EVENT_BUS_NAME: optionalName,
  })
  .superRefine((env, context) => {
    if (env.FEATURE_FLAGS_SOURCE !== 'appconfig') return;
    for (const name of [
      'APPCONFIG_APPLICATION',
      'APPCONFIG_ENVIRONMENT',
      'APPCONFIG_PROFILE',
    ] as const) {
      if (!env[name]) {
        context.addIssue({
          code: 'custom',
          path: [name],
          message: 'Required when FEATURE_FLAGS_SOURCE is appconfig',
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
      data.FEATURE_FLAGS_SOURCE === 'appconfig'
        ? {
            source: 'appconfig',
            // Checked by superRefine above.
            application: data.APPCONFIG_APPLICATION ?? '',
            environment: data.APPCONFIG_ENVIRONMENT ?? '',
            profile: data.APPCONFIG_PROFILE ?? '',
            pollIntervalSeconds: data.APPCONFIG_POLL_INTERVAL_SECONDS,
          }
        : { source: 'env' },
    storage: { booksTable: data.BOOKS_TABLE, loansTable: data.LOANS_TABLE },
    events: { busName: data.EVENT_BUS_NAME },
  };
};
