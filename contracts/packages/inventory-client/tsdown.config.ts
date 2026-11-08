import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/validators.ts', 'src/mocks.ts'],
  format: 'esm',
  platform: 'neutral',
  dts: true,
  publint: true,
});
