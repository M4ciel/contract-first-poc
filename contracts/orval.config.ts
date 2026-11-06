import { defineConfig } from 'orval';

/**
 * Code generation for every API contract.
 *
 * Requests are strict (unknown fields are rejected) and responses are not strict at this stage.
 * Response tolerance (dropping unknown fields, `unknown` enum fallback) is applied afterwards by
 * scripts/apply-response-enum-fallback.ts.
 */
const zodOverride = {
  generateReusableSchemas: false,
  strict: { param: true, query: true, header: true, body: true, response: false },
} as const;

export default defineConfig({
  // Public API: web → backend.
  library: {
    input: { target: './artifacts/library.bundle.yaml' },
    output: {
      target: './packages/api-client/src/generated/client.ts',
      schemas: {
        path: './packages/api-types/src/generated',
        type: 'zod',
        importPath: '@acme/api-types',
      },
      mode: 'single',
      client: 'react-query',
      httpClient: 'fetch',
      tsconfig: './packages/api-client/tsconfig.json',
      mock: { generators: [{ type: 'msw' }] },
      override: {
        zod: zodOverride,
        fetch: { runtimeValidation: false },
        query: { version: 5 },
      },
      clean: true,
      formatter: 'prettier',
    },
  },

  // Internal API: backend → inventory Lambda.
  inventory: {
    input: { target: './artifacts/inventory.bundle.yaml' },
    output: {
      target: './packages/inventory-client/src/generated/client.ts',
      schemas: {
        path: './packages/inventory-client/src/generated/schemas',
        type: 'zod',
      },
      mode: 'single',
      client: 'fetch',
      tsconfig: './packages/inventory-client/tsconfig.json',
      mock: { generators: [{ type: 'msw' }] },
      override: {
        zod: zodOverride,
        fetch: { runtimeValidation: false },
      },
      clean: true,
      formatter: 'prettier',
    },
  },
});
