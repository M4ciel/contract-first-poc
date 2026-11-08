import { InMemoryProvider } from '@openfeature/server-sdk';
import { testConfig } from '@testing/test-app.js';
import { createFlagProvider, featureFlagsProvider } from './feature-flags.factory.js';
import { FlagsmithProvider } from './flagsmith-provider.js';

describe('feature flag providers', () => {
  it('uses fixed values from the environment by default', async () => {
    const flags = await featureFlagsProvider.useFactory(testConfig({ booksV2: true }));
    const off = await featureFlagsProvider.useFactory(testConfig());

    await expect(flags.isEnabled('booksV2')).resolves.toBe(true);
    await expect(off.isEnabled('booksV2')).resolves.toBe(false);
    expect(createFlagProvider(testConfig())).toBeInstanceOf(InMemoryProvider);
  });

  it('uses Flagsmith with local evaluation when it is configured', async () => {
    const provider = createFlagProvider({
      ...testConfig(),
      featureFlags: {
        source: 'flagsmith',
        apiUrl: 'http://flagsmith.test/api/v1/',
        serverKey: 'ser.example',
        refreshIntervalSeconds: 5,
      },
    });

    expect(provider).toBeInstanceOf(FlagsmithProvider);
    await provider.onClose?.();
  });
});
