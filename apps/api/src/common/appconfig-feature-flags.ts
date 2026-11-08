import {
  type AppConfigDataClient,
  GetLatestConfigurationCommand,
  StartConfigurationSessionCommand,
} from '@aws-sdk/client-appconfigdata';
import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { z } from 'zod';
import { APPCONFIG_DATA } from '@cloud/aws-clients.js';
import { APP_CONFIG, type AppConfig, type FeatureFlagValues } from '@config/app-config.js';
import { type FeatureFlag, FeatureFlags } from './feature-flags.js';

/** What a `AWS.AppConfig.FeatureFlags` profile returns: `{ "<flag>": { "enabled": true } }`. */
const FlagsDocument = z.record(z.string(), z.looseObject({ enabled: z.boolean() }));

/** Every flag is off until AppConfig says otherwise. */
const ALL_OFF: FeatureFlagValues = { booksV2: false };

/**
 * Feature flags from AWS AppConfig. Guards read flags synchronously, so the values are cached and
 * refreshed in the background: a new AppConfig deployment takes effect within one poll interval,
 * without a restart. If a refresh fails, the last known values stay.
 */
@Injectable()
export class AppConfigFeatureFlags extends FeatureFlags implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppConfigFeatureFlags.name);
  private values: FeatureFlagValues = ALL_OFF;
  private token: string | undefined;
  private timer: NodeJS.Timeout | undefined;

  constructor(
    @Inject(APPCONFIG_DATA) private readonly client: AppConfigDataClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {
    super();
  }

  /** Fails startup if AppConfig cannot be reached: a backend must not start with unknown flags. */
  async onModuleInit(): Promise<void> {
    const source = this.config.featureFlags;
    if (source.source !== 'appconfig')
      throw new Error('AppConfig feature flags are not configured');
    const session = await this.client.send(
      new StartConfigurationSessionCommand({
        ApplicationIdentifier: source.application,
        EnvironmentIdentifier: source.environment,
        ConfigurationProfileIdentifier: source.profile,
        RequiredMinimumPollIntervalInSeconds: source.pollIntervalSeconds,
      }),
    );
    this.token = session.InitialConfigurationToken;
    await this.refresh();
    this.timer = setInterval(() => void this.refresh(), source.pollIntervalSeconds * 1000);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  /** Polls AppConfig once. An empty configuration means "unchanged since the last poll". */
  async refresh(): Promise<void> {
    try {
      const result = await this.client.send(
        new GetLatestConfigurationCommand({ ConfigurationToken: this.token }),
      );
      this.token = result.NextPollConfigurationToken ?? this.token;
      if (!result.Configuration || result.Configuration.length === 0) return;
      const document = FlagsDocument.parse(
        JSON.parse(new TextDecoder().decode(result.Configuration)),
      );
      this.values = { booksV2: document['booksV2']?.enabled ?? false };
    } catch (error) {
      this.logger.warn(`Keeping the last known feature flags: ${String(error)}`);
    }
  }

  override isEnabled(flag: FeatureFlag): boolean {
    return this.values[flag];
  }
}
