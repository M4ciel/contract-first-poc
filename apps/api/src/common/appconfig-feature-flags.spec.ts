import {
  type AppConfigDataClient,
  GetLatestConfigurationCommand,
  StartConfigurationSessionCommand,
} from '@aws-sdk/client-appconfigdata';
import { fakeAwsClient, inputOf } from '@testing/fake-aws-client.js';
import { testConfig } from '@testing/test-app.js';
import { AppConfigFeatureFlags } from './appconfig-feature-flags.js';

const config = {
  ...testConfig(),
  featureFlags: {
    source: 'appconfig' as const,
    application: 'acme-library',
    environment: 'local',
    profile: 'feature-flags',
    pollIntervalSeconds: 15,
  },
};

const session = () => ({ InitialConfigurationToken: 'token-1' });
const configuration =
  (document: unknown, next = 'token-2') =>
  () => ({
    Configuration: new TextEncoder().encode(JSON.stringify(document)),
    NextPollConfigurationToken: next,
  });

describe('AppConfigFeatureFlags', () => {
  let flags: AppConfigFeatureFlags | undefined;
  afterEach(() => flags?.onModuleDestroy());

  it('starts a session and reads the flags at startup', async () => {
    const { client, sent } = fakeAwsClient<AppConfigDataClient>([
      session,
      configuration({ booksV2: { enabled: true } }),
    ]);
    flags = new AppConfigFeatureFlags(client, config);

    await flags.onModuleInit();

    expect(flags.isEnabled('booksV2')).toBe(true);
    expect(sent[0]).toBeInstanceOf(StartConfigurationSessionCommand);
    expect(inputOf(sent)).toEqual({
      ApplicationIdentifier: 'acme-library',
      EnvironmentIdentifier: 'local',
      ConfigurationProfileIdentifier: 'feature-flags',
      RequiredMinimumPollIntervalInSeconds: 15,
    });
    expect(sent[1]).toBeInstanceOf(GetLatestConfigurationCommand);
    expect(inputOf(sent, 1)).toEqual({ ConfigurationToken: 'token-1' });
  });

  it('picks up a new deployment and keeps the values when nothing changed', async () => {
    const { client, sent } = fakeAwsClient<AppConfigDataClient>([
      session,
      configuration({}),
      configuration({ booksV2: { enabled: true } }, 'token-3'),
      () => ({ Configuration: new Uint8Array(), NextPollConfigurationToken: 'token-4' }),
    ]);
    flags = new AppConfigFeatureFlags(client, config);
    await flags.onModuleInit();
    expect(flags.isEnabled('booksV2')).toBe(false);

    await flags.refresh();
    expect(flags.isEnabled('booksV2')).toBe(true);

    await flags.refresh();
    expect(flags.isEnabled('booksV2')).toBe(true);
    expect(inputOf(sent, 3)).toEqual({ ConfigurationToken: 'token-3' });
  });

  it('keeps the last known values when a poll fails or returns an invalid document', async () => {
    const { client } = fakeAwsClient<AppConfigDataClient>([
      session,
      configuration({ booksV2: { enabled: true } }),
      () => Promise.reject(new Error('throttled')),
      configuration({ booksV2: { enabled: 'yes' } }),
    ]);
    flags = new AppConfigFeatureFlags(client, config);
    await flags.onModuleInit();

    await flags.refresh();
    await flags.refresh();

    expect(flags.isEnabled('booksV2')).toBe(true);
  });

  it('fails startup when it is not configured for AppConfig', async () => {
    const { client } = fakeAwsClient<AppConfigDataClient>([]);
    flags = new AppConfigFeatureFlags(client, testConfig());

    await expect(flags.onModuleInit()).rejects.toThrow(
      'AppConfig feature flags are not configured',
    );
  });
});
