import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig, type FeatureFlagValues } from '@config/app-config.js';

export type FeatureFlag = keyof FeatureFlagValues;

/**
 * Feature flags read by the application: from environment variables (`EnvFeatureFlags`, default)
 * or from AWS AppConfig (`AppConfigFeatureFlags`). Controllers only see this class.
 */
export abstract class FeatureFlags {
  abstract isEnabled(flag: FeatureFlag): boolean;
}

@Injectable()
export class EnvFeatureFlags extends FeatureFlags {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    super();
  }

  override isEnabled(flag: FeatureFlag): boolean {
    return this.config.features[flag];
  }
}
