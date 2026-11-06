// Native ESM, like the other projects (`--experimental-vm-modules` is set on the `test` target).
module.exports = {
  displayName: 'legacy-client',
  preset: '../../jest.preset.cjs',
  roots: ['<rootDir>/src'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true, tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  // The frozen schemas are a fixture (a copy of generated code), not code under test.
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/frozen/**'],
  coverageDirectory: '../../coverage/legacy-client',
};
