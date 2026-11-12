import { defineConfig } from 'orval';

/**
 * Code generation for every API contract.
 *
 * Requests are strict (unknown fields are rejected) and responses are not strict at this stage.
 * Response tolerance (dropping unknown fields, `unknown` enum fallback) is applied afterwards by
 * tooling/generate/apply-response-enum-fallback.ts.
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

  // Server-side request validators of the public API, one per operation and location
  // (`GetBookParams`, `ListBooksQueryParams`, `CreateLoanBody`), published as
  // `@acme/api-types/validators`. Path and query values arrive as strings, so they are coerced.
  // Projects run in order: this one writes inside the folder `library` cleans, so it comes after.
  libraryValidators: {
    input: { target: './artifacts/library.bundle.yaml' },
    output: {
      target: './packages/api-types/src/generated/validators/index.ts',
      mode: 'single',
      client: 'zod',
      override: {
        zod: {
          ...zodOverride,
          generate: { param: true, query: true, header: false, body: true, response: false },
          coerce: { param: true, query: true },
        },
      },
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
        // Base URL and fetch are set at runtime with `configureInventoryClient`.
        mutator: {
          path: './packages/inventory-client/src/http/custom-fetch.ts',
          name: 'customFetch',
        },
      },
      clean: true,
      formatter: 'prettier',
    },
  },

  // Server-side request validators of the internal API (`GetInventoryParams`,
  // `CreateReservationBody`), used by the inventory Lambda and published as
  // `@acme/inventory-client/validators`. Runs after `inventory`, which cleans the folder.
  inventoryValidators: {
    input: { target: './artifacts/inventory.bundle.yaml' },
    output: {
      target: './packages/inventory-client/src/generated/validators/index.ts',
      mode: 'single',
      client: 'zod',
      override: {
        zod: {
          ...zodOverride,
          generate: { param: true, query: true, header: false, body: true, response: false },
          coerce: { param: true, query: true },
        },
      },
      formatter: 'prettier',
    },
  },
});
