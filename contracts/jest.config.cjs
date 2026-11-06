// The scripts are native ESM run by Node's type stripping, so Jest runs them as ESM too
// (`--experimental-vm-modules` is set on the `test` target).
module.exports = {
  displayName: 'contracts',
  preset: '../jest.preset.cjs',
  roots: ['<rootDir>/scripts'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true, tsconfig: '<rootDir>/tsconfig.json' }],
  },
  // Coverage always runs, so the threshold below is enforced on every `nx test`.
  collectCoverage: true,
  collectCoverageFrom: ['scripts/**/*-core.ts'],
  coverageDirectory: '../coverage/contracts',
  // The core is the only logic in this project and all of it is reachable from tests.
  coverageThreshold: { global: { branches: 100, functions: 100, lines: 100, statements: 100 } },
};
