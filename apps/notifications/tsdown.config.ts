import { defineConfig } from 'tsdown';

// One self-contained file per Lambda: the AWS SDK and zod are bundled, so the
// deployment package is just `dist/index.mjs` (handler `index.handler`).
export default defineConfig({
  entry: { index: 'src/handler.ts' },
  format: 'esm',
  platform: 'node',
  target: 'node22',
  tsconfig: 'tsconfig.json',
  noExternal: [/.*/],
  dts: false,
  sourcemap: true,
  outExtensions: () => ({ js: '.mjs' }),
  // The SDK has lazy `import()`s; inline them so the package stays a single file.
  outputOptions: { inlineDynamicImports: true },
});
