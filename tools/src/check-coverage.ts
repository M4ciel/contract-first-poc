import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  addTotals,
  type CoverageSummary,
  formatReport,
  GLOBAL_FLOOR,
  metricsBelow,
  type Totals,
} from './coverage-core.ts';

// Usage (from the workspace root): node tools/src/check-coverage.ts
//
// Every Jest project in the repository must have a report: a project missing from the sum would
// raise the global number without anyone noticing.
const require = createRequire(import.meta.url);
const configs = execFileSync('git', ['ls-files', '*jest.config.cjs'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

const missing: string[] = [];
const rows: Array<readonly [string, Totals]> = [];
for (const config of configs) {
  const absolute = path.resolve(config);
  const { displayName, coverageDirectory } = require(absolute) as {
    displayName: string;
    coverageDirectory: string;
  };
  const file = path.join(path.dirname(absolute), coverageDirectory, 'coverage-summary.json');
  if (existsSync(file)) {
    const summary = JSON.parse(readFileSync(file, 'utf8')) as CoverageSummary;
    rows.push([displayName, summary.total]);
  } else {
    missing.push(`${displayName} (${path.relative(process.cwd(), file)})`);
  }
}

if (missing.length > 0) {
  console.error(`No coverage report for: ${missing.join(', ')}. Run the tests first.`);
  process.exit(1);
}

rows.sort(([a], [b]) => a.localeCompare(b));
const global = addTotals(rows.map(([, totals]) => totals));
console.log(formatReport([...rows, ['GLOBAL', global]]));

const failing = metricsBelow(global, GLOBAL_FLOOR);
if (failing.length > 0) {
  console.error(`\nGlobal coverage is below ${GLOBAL_FLOOR}% for: ${failing.join(', ')}`);
  process.exit(1);
}
console.log(`\nGlobal coverage is at or above ${GLOBAL_FLOOR}% on every metric.`);
