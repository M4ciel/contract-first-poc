import type { Client, Provider } from '@openfeature/server-sdk';
import type { FeatureFlagValues } from '@config/app-config.js';

export type FeatureFlag = keyof FeatureFlagValues;

/**
 * Feature flags as the application sees them. Controllers and guards only know this class; the
 * vendor behind it is an OpenFeature provider chosen from the configuration (feature-flags.factory.ts).
 */
export abstract class FeatureFlags {
  abstract isEnabled(flag: FeatureFlag): Promise<boolean>;
}

/**
 * Reads flags through OpenFeature, the vendor-neutral standard (CNCF): Flagsmith here, but the same
 * code would run on LaunchDarkly, Unleash or AppConfig by swapping the provider. Every flag
 * defaults to off when the provider cannot answer.
 */
export class OpenFeatureFeatureFlags extends FeatureFlags {
  constructor(
    private readonly client: Client,
    private readonly provider: Provider,
  ) {
    super();
  }

  override isEnabled(flag: FeatureFlag): Promise<boolean> {
    return this.client.getBooleanValue(flag, false);
  }

  /** Called by Nest on shutdown (the factory registers it): stops the provider's polling. */
  async onModuleDestroy(): Promise<void> {
    await this.provider.onClose?.();
  }
}
