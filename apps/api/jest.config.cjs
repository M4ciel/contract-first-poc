// The app is native ESM, so Jest runs it as ESM (`--experimental-vm-modules` is set on the `test`
// target). Imports keep the `.js` extension Node needs; Jest maps them back to the sources.
const { tsconfigPathsMapper } = require('../../jest.paths.cjs');

module.exports = {
  displayName: 'api',
  preset: '../../jest.preset.cjs',
  roots: ['<rootDir>/src'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true, tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleNameMapper: {
    ...tsconfigPathsMapper(__dirname),
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/testing/**', '!src/main.ts'],
  coverageDirectory: '../../coverage/api',
};
