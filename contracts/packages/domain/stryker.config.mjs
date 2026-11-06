// Mutation testing: Stryker changes the code (`>` to `>=`, `true` to `false`, ...) and requires a
// test to fail for each change. Coverage says a line ran; a killed mutant says a test checks it.
//
// Stryker runs from the workspace root (see the `mutation` target) because the package extends
// root configs (`tsconfig.base.json`, `jest.preset.cjs`). Only those files and this package are
// copied to the sandbox; `node_modules` is symlinked.
const project = 'contracts/packages/domain';

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: 'pnpm',
  // pnpm does not hoist plugins next to @stryker-mutator/core, so name them explicitly.
  plugins: ['@stryker-mutator/jest-runner', '@stryker-mutator/typescript-checker'],
  testRunner: 'jest',
  // The package is native ESM, so Jest runs it as ESM.
  testRunnerNodeArgs: ['--experimental-vm-modules', '--no-warnings=ExperimentalWarning'],
  jest: { configFile: `${project}/jest.config.cjs`, enableFindRelatedTests: false },
  checkers: ['typescript'],
  tsconfigFile: `${project}/tsconfig.json`,
  ignorePatterns: [
    '/*',
    '!/package.json',
    '!/tsconfig.base.json',
    '!/jest.preset.cjs',
    '!/contracts',
    '/contracts/*',
    '!/contracts/packages',
    '/contracts/packages/*',
    `!/${project}`,
    `/${project}/dist`,
  ],
  mutate: [`${project}/src/**/*.ts`, `!${project}/src/**/*.spec.ts`, `!${project}/src/index.ts`],
  coverageAnalysis: 'perTest',
  reporters: ['clear-text', 'progress', 'html'],
  htmlReporter: { fileName: 'reports/mutation/domain/index.html' },
  tempDirName: '.stryker-tmp/domain',
  // Every surviving mutant fails the run. Equivalent mutants are disabled inline with
  // `// Stryker disable next-line <mutator>: <reason>`, so the exception is visible in review.
  thresholds: { high: 100, low: 100, break: 100 },
};
