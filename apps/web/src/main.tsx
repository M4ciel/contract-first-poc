import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
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
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App mockMode={useMocks} />
      </QueryClientProvider>
    </StrictMode>,
  );
};

void bootstrap();
