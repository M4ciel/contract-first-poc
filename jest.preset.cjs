// Shared Jest preset: every project config extends this one.
const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  testEnvironment: 'node',
  coverageReporters: ['text-summary', 'lcov', 'json-summary'],
};
