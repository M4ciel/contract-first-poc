import { ErrorCode, OpenFeature } from '@openfeature/server-sdk';
import { type FlagsmithClient, FlagsmithProvider } from './flagsmith-provider.js';

/** A Flagsmith SDK stand-in: the flags of one environment, plus call counters. */
const fakeFlagsmith = (flags: Record<string, boolean>) => {
  const calls = { fetch: 0, close: 0 };
  const client: FlagsmithClient = {
    getEnvironmentFlags: () => {
      calls.fetch += 1;
      return Promise.resolve({
        getFlag: (name: string) =>
          name in flags
            ? { enabled: flags[name] ?? false, isDefault: false, value: undefined }
            : { enabled: false, isDefault: true, value: undefined },
      });
    },
    close: () => {
      calls.close += 1;
      return Promise.resolve();
    },
  };
  return { client, calls };
};

describe('FlagsmithProvider', () => {
  const domain = 'flagsmith-provider-spec';
  afterEach(() => OpenFeature.clearProviders());

  it('downloads the environment when OpenFeature initializes it', async () => {
    const { client, calls } = fakeFlagsmith({});

    await OpenFeature.setProviderAndWait(domain, new FlagsmithProvider(client));

    expect(calls.fetch).toBe(1);
  });

  it('answers boolean flags through OpenFeature', async () => {
    const { client } = fakeFlagsmith({ booksV2: true, other: false });
    await OpenFeature.setProviderAndWait(domain, new FlagsmithProvider(client));
    const flags = OpenFeature.getClient(domain);

    await expect(flags.getBooleanValue('booksV2', false)).resolves.toBe(true);
    await expect(flags.getBooleanValue('other', true)).resolves.toBe(false);
  });

  it('falls back to the default for an unknown flag', async () => {
    const { client } = fakeFlagsmith({});
    await OpenFeature.setProviderAndWait(domain, new FlagsmithProvider(client));

    const details = await OpenFeature.getClient(domain).getBooleanDetails('missing', false);

    expect(details).toMatchObject({ value: false, errorCode: ErrorCode.FLAG_NOT_FOUND });
  });

  it('reports non-boolean flags as a type mismatch', async () => {
    const { client } = fakeFlagsmith({ booksV2: true });
    await OpenFeature.setProviderAndWait(domain, new FlagsmithProvider(client));
    const flags = OpenFeature.getClient(domain);

    await expect(flags.getStringDetails('booksV2', 'x')).resolves.toMatchObject({
      value: 'x',
      errorCode: ErrorCode.TYPE_MISMATCH,
    });
    await expect(flags.getNumberDetails('booksV2', 1)).resolves.toMatchObject({ value: 1 });
    await expect(flags.getObjectDetails('booksV2', {})).resolves.toMatchObject({ value: {} });
  });

  it('closes the SDK (and its polling) on shutdown', async () => {
    const { client, calls } = fakeFlagsmith({});
    const provider = new FlagsmithProvider(client);

    await provider.onClose();

    expect(calls.close).toBe(1);
  });
});
