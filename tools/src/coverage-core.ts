/**
 * Global coverage: every project writes `coverage/<project>/coverage-summary.json` (Jest's
 * `json-summary` reporter). Projects cover disjoint files, so adding their totals gives the
 * coverage of the whole repository, which must stay at or above the floor.
 */

export const METRICS = ['lines', 'statements', 'functions', 'branches'] as const;
export type Metric = (typeof METRICS)[number];

export interface Counter {
  readonly total: number;
  readonly covered: number;
}

export type Totals = Readonly<Record<Metric, Counter>>;

/** The part of Jest's coverage-summary.json this check reads. */
export interface CoverageSummary {
  readonly total: Totals;
}

export const GLOBAL_FLOOR = 80;

const empty = (): Record<Metric, Counter> => ({
  lines: { total: 0, covered: 0 },
  statements: { total: 0, covered: 0 },
  functions: { total: 0, covered: 0 },
  branches: { total: 0, covered: 0 },
});

export const addTotals = (summaries: readonly Totals[]): Totals =>
  summaries.reduce<Record<Metric, Counter>>((sum, totals) => {
    for (const metric of METRICS) {
      sum[metric] = {
        total: sum[metric].total + totals[metric].total,
        covered: sum[metric].covered + totals[metric].covered,
      };
    }
    return sum;
  }, empty());

/** Percentage with two decimals; nothing to cover counts as fully covered. */
export const percentage = ({ total, covered }: Counter): number =>
  total === 0 ? 100 : Math.floor((covered / total) * 10_000) / 100;

export const metricsBelow = (totals: Totals, floor: number): Metric[] =>
  METRICS.filter((metric) => percentage(totals[metric]) < floor);

export const formatReport = (rows: ReadonlyArray<readonly [string, Totals]>): string => {
  const header = ['project', ...METRICS].map((cell) => cell.padEnd(14)).join('');
  const lines = rows.map(([name, totals]) =>
    [name, ...METRICS.map((metric) => `${percentage(totals[metric]).toFixed(2)}%`)]
      .map((cell) => cell.padEnd(14))
      .join(''),
  );
  return [header, ...lines].join('\n');
};
