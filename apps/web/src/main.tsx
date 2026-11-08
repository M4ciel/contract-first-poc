import { OpenFeature, OpenFeatureProvider } from '@openfeature/react-sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { createFlagProvider } from './flags/flag-provider.ts';
import './styles.css';

const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';

const bootstrap = async (): Promise<void> => {
  if (useMocks) {
    // Loaded only in mock mode, so production bundles contain neither msw nor faker.
    const { startMockApi } = await import('./mocks/browser.ts');
    await startMockApi();
  }
  const root = document.getElementById('root');
  if (!root) throw new Error('Missing #root element');
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // Flags through OpenFeature: Flagsmith, or fixed values in mock mode (see flag-provider.ts).
  // Wait for them before the first render, so the screen does not switch versions after loading.
  // If Flagsmith is down, every flag stays off and the app still works.
  await OpenFeature.setProviderAndWait(createFlagProvider(import.meta.env)).catch(
    (error: unknown) => console.warn('Feature flags unavailable, using defaults:', error),
  );
  createRoot(root).render(
    <StrictMode>
      <OpenFeatureProvider>
        <QueryClientProvider client={queryClient}>
          <App mockMode={useMocks} />
        </QueryClientProvider>
      </OpenFeatureProvider>
    </StrictMode>,
  );
};

void bootstrap();
