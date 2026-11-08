import { FlagsmithClientProvider } from '@openfeature/flagsmith-client-provider';
import { InMemoryProvider, type Provider } from '@openfeature/web-sdk';

/** Flags the web app reads. The same names as in the backend and in Flagsmith. */
export const FLAGS = { booksV2: 'booksV2' } as const;

export interface FlagEnvironment {
  readonly VITE_USE_MOCKS?: string;
  readonly VITE_FLAGSMITH_ENVIRONMENT_KEY?: string;
  readonly VITE_FLAGSMITH_API_URL?: string;
  readonly VITE_FLAG_BOOKS_V2?: string;
}

const fixedValue = (enabled: boolean) => ({
  variants: { on: true, off: false },
  defaultVariant: enabled ? 'on' : 'off',
  disabled: false,
});

/**
 * The app reads flags through OpenFeature, like the backend: Flagsmith when a client key is set,
 * fixed values otherwise. Mock mode never calls Flagsmith, so a frontend developer can turn on a
 * flag for a feature whose backend does not exist yet (VITE_FLAG_BOOKS_V2=true) and build it on
 * the generated MSW mocks.
 */
export const createFlagProvider = (env: FlagEnvironment): Provider => {
  const key = env.VITE_FLAGSMITH_ENVIRONMENT_KEY;
  if (env.VITE_USE_MOCKS !== 'true' && key) {
    return new FlagsmithClientProvider({
      environmentID: key,
      api: env.VITE_FLAGSMITH_API_URL ?? 'http://localhost:8000/api/v1/',
    });
  }
  return new InMemoryProvider({ [FLAGS.booksV2]: fixedValue(env.VITE_FLAG_BOOKS_V2 === 'true') });
};
