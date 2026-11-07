// Unit tests cover the view logic (plain TypeScript); the rendered app is covered by Playwright
// (e2e/). Native ESM, like the other projects (`--experimental-vm-modules` is set on the target).
const { tsconfigPathsMapper } = require('../../jest.paths.cjs');

module.exports = {
  displayName: 'web',
  preset: '../../jest.preset.cjs',
  roots: ['<rootDir>/src'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true, tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleNameMapper: tsconfigPathsMapper(__dirname),
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/mocks/**', '!src/**/*.d.ts'],
  coverageDirectory: '../../coverage/web',
};
