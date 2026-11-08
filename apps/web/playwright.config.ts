import { defineConfig, devices } from '@playwright/test';

const API_STUBS_PORT = 4310;
const MOCK_MODE_PORT = 4311;

/**
 * Two dev servers:
 * - `api-stubs`: the app talks to `/v1/...` as usual; each test answers with `page.route`, using
 *   bodies from the contract's generated mocks, to drive exact cases (unknown status, 409, ...).
 * - `mock-mode`: `VITE_USE_MOCKS=true`, the MSW worker answers in the browser and no backend runs;
 *   the booksV2 flag is on, so the app shows the alpha `/v2/books` catalog.
 * Neither server has a Flagsmith key, so flags are fixed values (VITE_FLAG_*).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  reporter: [['list'], ['html', { outputFolder: '../../reports/e2e/web', open: 'never' }]],
  outputDir: '../../reports/e2e/web-results',
  use: { trace: 'retain-on-failure', ...devices['Desktop Chrome'] },
  projects: [
    {
      name: 'api-stubs',
      testIgnore: /mock-mode\.spec\.ts/,
      use: { baseURL: `http://localhost:${API_STUBS_PORT}` },
    },
    {
      name: 'mock-mode',
      testMatch: /mock-mode\.spec\.ts/,
      use: { baseURL: `http://localhost:${MOCK_MODE_PORT}` },
    },
  ],
  webServer: [
    {
      // Unroutable proxy target: a request the test forgot to stub fails instead of reaching a
      // real backend.
      command: `vite --port ${API_STUBS_PORT} --strictPort`,
      env: { API_PROXY_TARGET: 'http://127.0.0.1:9' },
      url: `http://localhost:${API_STUBS_PORT}`,
      reuseExistingServer: !process.env['CI'],
    },
    {
      command: `vite --port ${MOCK_MODE_PORT} --strictPort`,
      // The booksV2 flag is on: the frontend builds the alpha /v2 screen on the generated mocks.
      env: { VITE_USE_MOCKS: 'true', VITE_FLAG_BOOKS_V2: 'true' },
      url: `http://localhost:${MOCK_MODE_PORT}`,
      reuseExistingServer: !process.env['CI'],
    },
  ],
});
