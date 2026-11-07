module.exports = {
  displayName: 'tools',
  preset: '../jest.preset.cjs',
  roots: ['<rootDir>/src'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true, tsconfig: '<rootDir>/tsconfig.json' }],
  },
  collectCoverageFrom: ['src/**/*-core.ts'],
  coverageDirectory: '../coverage/tools',
  coverageThreshold: { global: { branches: 100, functions: 100, lines: 100, statements: 100 } },
};
