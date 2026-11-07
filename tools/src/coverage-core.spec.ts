import { addTotals, formatReport, metricsBelow, percentage, type Totals } from './coverage-core.ts';

const totals = (lines: [number, number], branches: [number, number] = [0, 0]): Totals => ({
  lines: { total: lines[0], covered: lines[1] },
  statements: { total: lines[0], covered: lines[1] },
  functions: { total: 2, covered: 2 },
  branches: { total: branches[0], covered: branches[1] },
});

describe('addTotals', () => {
  it('adds the counters of every project', () => {
    expect(addTotals([totals([10, 9], [4, 2]), totals([30, 15], [6, 6])])).toEqual({
      lines: { total: 40, covered: 24 },
      statements: { total: 40, covered: 24 },
      functions: { total: 4, covered: 4 },
      branches: { total: 10, covered: 8 },
    });
  });

  it('is empty for no projects', () => {
    expect(percentage(addTotals([]).lines)).toBe(100);
  });
});

describe('percentage', () => {
  it('rounds down to two decimals, so 79.999% never passes as 80%', () => {
    expect(percentage({ total: 3, covered: 2 })).toBe(66.66);
    expect(percentage({ total: 100_000, covered: 79_999 })).toBe(79.99);
  });

  it('treats nothing to cover as fully covered', () => {
    expect(percentage({ total: 0, covered: 0 })).toBe(100);
  });
});

describe('metricsBelow', () => {
  it('lists the metrics under the floor; the floor itself passes', () => {
    expect(metricsBelow(totals([10, 8], [10, 7]), 80)).toEqual(['branches']);
    expect(metricsBelow(totals([10, 8], [10, 8]), 80)).toEqual([]);
  });
});

describe('formatReport', () => {
  it('prints one row per project with every metric', () => {
    const report = formatReport([['api', totals([4, 3])]]);

    expect(report.split('\n')).toEqual([
      'project'.padEnd(14) +
        'lines'.padEnd(14) +
        'statements'.padEnd(14) +
        'functions'.padEnd(14) +
        'branches'.padEnd(14),
      'api'.padEnd(14) +
        '75.00%'.padEnd(14) +
        '75.00%'.padEnd(14) +
        '100.00%'.padEnd(14) +
        '100.00%'.padEnd(14),
    ]);
  });
});
