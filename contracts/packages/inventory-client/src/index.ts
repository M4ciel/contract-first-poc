// Public entry point: the generated client and schemas, plus the runtime configuration of the
// Orval mutator they call (base URL and fetch). No other hand-written code belongs here.
export * from './generated/client';
export * from './generated/schemas/index';
export { configureInventoryClient } from './http/custom-fetch';
export type { InventoryClientConfig } from './http/custom-fetch';
