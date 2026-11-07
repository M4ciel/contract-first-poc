import { getAcmeLibraryAPIMock } from '@acme/api-client/mocks';
import { setupWorker } from 'msw/browser';

/**
 * Answers every Library API call in the browser with the handlers generated from the contract,
 * so the frontend runs without a backend. Anything else (Vite modules, assets) goes to the network.
 */
export const startMockApi = async (): Promise<void> => {
  await setupWorker(...getAcmeLibraryAPIMock()).start({ onUnhandledFrame: 'bypass', quiet: true });
};
