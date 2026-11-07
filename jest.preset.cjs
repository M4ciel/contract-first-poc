// Shared Jest preset: every project config extends this one.
const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  testEnvironment: 'node',
  // Every project reports coverage; `nx run @acme/tools:coverage` adds them up and enforces the
  // global floor.
  collectCoverage: true,
  coverageReporters: ['text-summary', 'lcov', 'json-summary'],
};
