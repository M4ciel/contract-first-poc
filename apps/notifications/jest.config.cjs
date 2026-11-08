const { tsconfigPathsMapper } = require('../../jest.paths.cjs');

// Native ESM, like the other projects (`--experimental-vm-modules` is set on the `test` target).
module.exports = {
  displayName: 'notifications',
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
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts'],
  coverageDirectory: '../../coverage/notifications',
};
