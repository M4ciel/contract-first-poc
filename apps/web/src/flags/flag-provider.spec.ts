import { FlagsmithClientProvider } from '@openfeature/flagsmith-client-provider';
import { InMemoryProvider, OpenFeature } from '@openfeature/web-sdk';
import { createFlagProvider, FLAGS } from './flag-provider.ts';

describe('createFlagProvider', () => {
  afterEach(() => OpenFeature.clearProviders());

  const booksV2 = async (env: Parameters<typeof createFlagProvider>[0]) => {
    await OpenFeature.setProviderAndWait(createFlagProvider(env));
    return OpenFeature.getClient().getBooleanValue(FLAGS.booksV2, false);
  };

  it('uses Flagsmith when a client key is configured', () => {
    expect(createFlagProvider({ VITE_FLAGSMITH_ENVIRONMENT_KEY: 'key' })).toBeInstanceOf(
      FlagsmithClientProvider,
    );
  });

  it('never calls Flagsmith in mock mode, even with a key', async () => {
    const env = { VITE_USE_MOCKS: 'true', VITE_FLAGSMITH_ENVIRONMENT_KEY: 'key' };

    expect(createFlagProvider(env)).toBeInstanceOf(InMemoryProvider);
    await expect(booksV2(env)).resolves.toBe(false);
  });

  it('turns a flag on with VITE_FLAG_* when Flagsmith is not used', async () => {
    await expect(booksV2({ VITE_FLAG_BOOKS_V2: 'true' })).resolves.toBe(true);
    await expect(booksV2({})).resolves.toBe(false);
  });
});
