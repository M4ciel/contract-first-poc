import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// The contract's server is `/` (same origin), so the generated client calls `/v1/...`. In dev,
// Vite forwards those calls to the backend; with `VITE_USE_MOCKS=true`, MSW answers them in the
// browser and the backend may be off.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env['API_PROXY_TARGET'] ?? 'http://localhost:3000';
  const useMocks = env['VITE_USE_MOCKS'] === 'true';
  return {
    plugins: [react()],
    resolve: { tsconfigPaths: true },
    // The MSW worker (`nx run @acme/web:msw-worker`) is served only in mock mode, so it never
    // ends up in a production build.
    publicDir: useMocks ? 'mock-worker' : false,
    server: {
      port: 4200,
      proxy: { '/v1': target, '/v2': target },
    },
  };
});
