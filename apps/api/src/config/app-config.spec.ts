import { loadConfig } from './app-config.js';

describe('loadConfig', () => {
  const required = { INVENTORY_BASE_URL: 'http://inventory.test/local' };

  it('applies defaults', () => {
    expect(loadConfig(required)).toEqual({
      port: 3000,
      host: '0.0.0.0',
      inventoryBaseUrl: 'http://inventory.test/local',
      inventoryTimeoutMs: 2000,
      features: { booksV2: false },
    });
  });

  it('reads every variable', () => {
    expect(
      loadConfig({
        ...required,
        PORT: '8080',
        HOST: '127.0.0.1',
        INVENTORY_TIMEOUT_MS: '500',
        FEATURE_BOOKS_V2: 'true',
      }),
    ).toMatchObject({
      port: 8080,
      host: '127.0.0.1',
      inventoryTimeoutMs: 500,
      features: { booksV2: true },
    });
  });

  it('fails fast and lists every invalid variable', () => {
    expect(() => loadConfig({ PORT: '0', FEATURE_BOOKS_V2: 'yes' })).toThrow(
      /Invalid configuration:\n- PORT: .+\n- INVENTORY_BASE_URL: .+\n- FEATURE_BOOKS_V2: .+/,
    );
  });
});
