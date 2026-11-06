// The package is native ESM, so Jest runs it as ESM (`--experimental-vm-modules` is set on the
// `test` target and in the Stryker config).
module.exports = {
  displayName: 'domain',
  preset: '../../../jest.preset.cjs',
  roots: ['<rootDir>/src'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true, tsconfig: '<rootDir>/tsconfig.json' }],
  },
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/index.ts'],
  coverageDirectory: '../../../coverage/domain',
  // Shared business rules: every line and branch must be exercised (see also `mutation`).
  coverageThreshold: { global: { branches: 100, functions: 100, lines: 100, statements: 100 } },
};
