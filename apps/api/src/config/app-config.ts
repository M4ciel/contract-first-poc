import { z } from 'zod';

/** Runtime configuration, read once from environment variables and validated at startup. */
export interface AppConfig {
  readonly port: number;
  readonly host: string;
  /** Base URL of the inventory service (API Gateway stage URL in AWS). */
  readonly inventoryBaseUrl: string;
  /** Timeout of each call to the inventory service, in milliseconds. */
  readonly inventoryTimeoutMs: number;
  readonly features: FeatureFlagValues;
}

export interface FeatureFlagValues {
  /** Exposes `GET /v2/books` (alpha). Off by default, as in production. */
  readonly booksV2: boolean;
}

export const APP_CONFIG = Symbol('APP_CONFIG');

const flag = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  HOST: z.string().min(1).default('0.0.0.0'),
  INVENTORY_BASE_URL: z.url(),
  INVENTORY_TIMEOUT_MS: z.coerce.number().int().min(1).default(2000),
  FEATURE_BOOKS_V2: flag,
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
  };
};
