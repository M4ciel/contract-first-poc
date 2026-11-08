import { randomUUID } from 'node:crypto';
import { Flagsmith } from '@flagsmith/nodejs';
import type { FactoryProvider } from '@nestjs/common';
import { InMemoryProvider, OpenFeature, type Provider } from '@openfeature/server-sdk';
import { APP_CONFIG, type AppConfig } from '@config/app-config.js';
import { FeatureFlags, OpenFeatureFeatureFlags } from './feature-flags.js';
import { FlagsmithProvider } from './flagsmith-provider.js';

/** Builds the OpenFeature provider the configuration asks for. */
export const createFlagProvider = (config: AppConfig): Provider => {
  const source = config.featureFlags;
  if (source.source === 'flagsmith') {
    return new FlagsmithProvider(
      new Flagsmith({
        apiUrl: source.apiUrl,
        environmentKey: source.serverKey,
        enableLocalEvaluation: true,
        environmentRefreshIntervalSeconds: source.refreshIntervalSeconds,
      }),
    );
  }
  // `env`: fixed values from FEATURE_* variables (tests, local development without Flagsmith).
  return new InMemoryProvider(
    Object.fromEntries(
      Object.entries(config.features).map(([flag, enabled]) => [
        flag,
        {
          variants: { on: true, off: false },
          defaultVariant: enabled ? 'on' : 'off',
          disabled: false,
        },
      ]),
    ),
  );
};

/**
 * OpenFeature keeps providers in a global registry. Each application instance registers its own
 * under a unique domain, so several instances (as in tests) never share flags.
 */
export const featureFlagsProvider: FactoryProvider<FeatureFlags> = {
  provide: FeatureFlags,
  inject: [APP_CONFIG],
  useFactory: async (config: AppConfig) => {
    const provider = createFlagProvider(config);
    const domain = `acme-api-${randomUUID()}`;
    await OpenFeature.setProviderAndWait(domain, provider);
    return new OpenFeatureFeatureFlags(OpenFeature.getClient(domain), provider);
  },
};
