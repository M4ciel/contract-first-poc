import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/**
 * Executable documentation of how the compatibility check treats `x-stability-level`. Each test
 * runs the pinned oasdiff binary (same flags as check-compatibility.sh) on a base and a revised
 * contract, so an oasdiff upgrade that changes this behaviour fails here first.
 */

const scriptsDir = path.join(process.cwd(), 'scripts', 'compat');
const contractsDir = process.cwd();
const oasdiff = execFileSync('bash', [path.join(scriptsDir, 'install-oasdiff.sh')], {
  encoding: 'utf8',
}).trim();

type Level = 'draft' | 'alpha' | 'beta' | 'stable';

interface Operation {
  readonly level?: Level | string;
  readonly required?: readonly string[];
  readonly extraProperty?: boolean;
  readonly statusEnum?: readonly string[];
  readonly queryParams?: ReadonlyArray<{ name: string; required: boolean }>;
}

const operation = ({
  level = 'stable',
  required = ['id', 'status'],
  extraProperty = false,
  statusEnum = ['active', 'returned'],
  queryParams = [],
}: Operation) => ({
  operationId: 'listItems',
  summary: 'List items',
  description: 'Lists items.',
  'x-stability-level': level,
  parameters: queryParams.map(({ name, required: isRequired }) => ({
    name,
    in: 'query',
    required: isRequired,
    description: `The ${name} filter.`,
    schema: { type: 'string' },
  })),
  responses: {
    '200': {
      description: 'The items.',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required,
            properties: {
              id: { type: 'string' },
              status: { type: 'string', enum: statusEnum },
              ...(extraProperty ? { note: { type: 'string' } } : {}),
            },
          },
        },
      },
    },
    '400': { description: 'Invalid request.' },
  },
});

const contract = (paths: Record<string, Operation | null>) => ({
  openapi: '3.1.0',
  info: {
    title: 'Fixture',
    version: '1.0.0',
    description: 'Fixture contract.',
    license: { name: 'MIT', identifier: 'MIT' },
  },
  servers: [{ url: 'https://api.example.test' }],
  security: [],
  tags: [{ name: 'items', description: 'Items.' }],
  paths: Object.fromEntries(
    Object.entries(paths)
      .filter((entry): entry is [string, Operation] => entry[1] !== null)
      .map(([route, op]) => [route, { get: { tags: ['items'], ...operation(op) } }]),
  ),
});

let work: string;
beforeAll(() => {
  work = mkdtempSync(path.join(tmpdir(), 'stability-'));
});
afterAll(() => rmSync(work, { recursive: true, force: true }));

const write = (name: string, value: unknown): string => {
  const file = path.join(work, name);
  writeFileSync(file, JSON.stringify(value));
  return file;
};

/** Runs `oasdiff breaking` exactly like the CI check and returns its exit code and output. */
const breaking = (
  base: Record<string, Operation | null>,
  revision: Record<string, Operation | null>,
  { severityLevels = true }: { severityLevels?: boolean } = {},
) => {
  const result = spawnSync(
    oasdiff,
    [
      'breaking',
      ...(severityLevels
        ? ['--severity-levels', path.join(scriptsDir, 'oasdiff-severity.txt')]
        : []),
      write('base.json', contract(base)),
      write('revision.json', contract(revision)),
      '--fail-on',
      'ERR',
      '--color',
      'never',
      '--allow-external-refs=false',
    ],
    { encoding: 'utf8' },
  );
  return { blocked: result.status === 1, output: result.stdout };
};

// The response property `status` stops being required: a client that relied on it breaks.
const breakingChange = (level: Level) =>
  breaking({ '/v1/items': { level } }, { '/v1/items': { level, required: ['id'] } });

describe('x-stability-level in the compatibility check', () => {
  it.each(['draft', 'alpha'] as const)('allows breaking changes in %s operations', (level) => {
    expect(breakingChange(level).blocked).toBe(false);
  });

  it.each(['beta', 'stable'] as const)('blocks breaking changes in %s operations', (level) => {
    const result = breakingChange(level);

    expect(result.blocked).toBe(true);
    expect(result.output).toContain('response-property-became-optional');
  });

  it('blocks lowering the level of an operation (stable → beta)', () => {
    const result = breaking(
      { '/v1/items': { level: 'stable' } },
      { '/v1/items': { level: 'beta' } },
    );

    expect(result.blocked).toBe(true);
    expect(result.output).toContain('api-stability-decreased');
  });

  it('allows promoting an operation (alpha → stable); from then on it is protected', () => {
    expect(
      breaking({ '/v1/items': { level: 'alpha' } }, { '/v1/items': { level: 'stable' } }).blocked,
    ).toBe(false);
  });

  it('blocks removing a stable operation without a deprecation period', () => {
    const result = breaking(
      { '/v1/items': { level: 'stable' }, '/v1/other-items': { level: 'stable' } },
      { '/v1/items': { level: 'stable' }, '/v1/other-items': null },
    );

    expect(result.blocked).toBe(true);
    expect(result.output).toContain('api-path-removed-without-deprecation');
  });

  it('allows removing an alpha operation', () => {
    expect(
      breaking(
        { '/v1/items': { level: 'stable' }, '/v2/items': { level: 'alpha' } },
        { '/v1/items': { level: 'stable' }, '/v2/items': null },
      ).blocked,
    ).toBe(false);
  });

  describe('additive changes to a stable operation (AGENTS.md compatibility rules)', () => {
    const base = { '/v1/items': { level: 'stable' as const } };

    it('allows a new optional response field', () => {
      expect(breaking(base, { '/v1/items': { extraProperty: true } }).blocked).toBe(false);
    });

    it('allows a new endpoint', () => {
      expect(breaking(base, { '/v1/items': {}, '/v1/new-items': { level: 'alpha' } }).blocked).toBe(
        false,
      );
    });

    it('allows a new optional query parameter', () => {
      expect(
        breaking(base, { '/v1/items': { queryParams: [{ name: 'q', required: false }] } }).blocked,
      ).toBe(false);
    });

    it('allows a new enum value in a response (clients map it to unknown)', () => {
      expect(
        breaking(base, { '/v1/items': { statusEnum: ['active', 'returned', 'lost'] } }).blocked,
      ).toBe(false);
    });

    it('needs oasdiff-severity.txt for that: oasdiff alone reports it as an error', () => {
      const result = breaking(
        base,
        { '/v1/items': { statusEnum: ['active', 'returned', 'lost'] } },
        { severityLevels: false },
      );

      expect(result.blocked).toBe(true);
      expect(result.output).toContain('response-property-enum-value-added');
    });

    it('blocks a new required query parameter', () => {
      const result = breaking(base, {
        '/v1/items': { queryParams: [{ name: 'q', required: true }] },
      });

      expect(result.blocked).toBe(true);
      expect(result.output).toContain('new-required-request-parameter');
    });
  });
});

describe('x-stability-level in the contract lint', () => {
  const lint = (level: string | undefined) => {
    const op = level === undefined ? {} : { level };
    const file = write('lint.json', contract({ '/v1/items': op }));
    if (level === undefined) {
      const raw = contract({ '/v1/items': op }) as { paths: Record<string, { get: object }> };
      delete (raw.paths['/v1/items']?.get as Record<string, unknown>)['x-stability-level'];
      writeFileSync(file, JSON.stringify(raw));
    }
    const result = spawnSync(
      path.join(contractsDir, '..', 'node_modules', '.bin', 'redocly'),
      ['lint', file, '--config', path.join(contractsDir, 'redocly.yaml'), '--format', 'stylish'],
      {
        encoding: 'utf8',
        env: { ...process.env, REDOCLY_TELEMETRY: 'off', REDOCLY_SUPPRESS_UPDATE_NOTICE: 'true' },
      },
    );
    return { failed: result.status !== 0, output: result.stdout + result.stderr };
  };

  it('accepts every valid level', () => {
    for (const level of ['draft', 'alpha', 'beta', 'stable']) {
      expect(lint(level)).toMatchObject({ failed: false });
    }
  });

  it.each([
    ['missing', undefined],
    ['unknown', 'experimental'],
  ])('rejects a %s level', (_, level) => {
    const result = lint(level);

    expect(result.failed).toBe(true);
    expect(result.output).toContain('operation-stability-level');
  });
});
