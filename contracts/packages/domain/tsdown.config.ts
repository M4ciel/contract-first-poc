import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  tsconfig: 'tsconfig.lib.json',
  format: 'esm',
  platform: 'neutral',
  dts: true,
  publint: true,
});
