import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig, type FeatureFlagValues } from '#src/config/app-config.js';

export type FeatureFlag = keyof FeatureFlagValues;

/**
 * Feature flags read by the application. The environment-based implementation is the default;
 * an AWS AppConfig implementation can replace it without touching the controllers.
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
