import {
  checkChangesets,
  packagesAffectedBy,
  packagesInChangeset,
} from './changeset-check-core.ts';

describe('packagesAffectedBy', () => {
  it.each([
    ['contracts/apis/library/paths/v1-books.yaml', ['@acme/api-types', '@acme/api-client']],
    ['contracts/apis/inventory/components/schemas/Inventory.yaml', ['@acme/inventory-client']],
    [
      'contracts/shared/components/schemas/ProblemType.yaml',
      ['@acme/api-types', '@acme/api-client', '@acme/inventory-client'],
    ],
    ['contracts/events/loan.created/v1.schema.json', ['@acme/events']],
    ['contracts/tooling/generate/generate-events.ts', ['@acme/events']],
    ['contracts/tooling/generate/event-files.ts', ['@acme/events']],
    [
      'contracts/orval.config.ts',
      ['@acme/api-types', '@acme/api-client', '@acme/inventory-client'],
    ],
    [
      'contracts/tooling/generate/apply-response-enum-fallback-core.ts',
      ['@acme/api-types', '@acme/api-client', '@acme/inventory-client'],
    ],
    ['contracts/packages/domain/src/loan.ts', ['@acme/domain']],
    ['contracts/packages/inventory-client/src/http/custom-fetch.ts', ['@acme/inventory-client']],
    ['contracts/packages/api-types/package.json', ['@acme/api-types']],
    ['contracts/packages/events/tsdown.config.ts', ['@acme/events']],
  ])('%s → %j', (path, packages) => {
    expect(packagesAffectedBy(path)).toEqual(packages);
  });

  it.each([
    'contracts/packages/domain/src/loan.spec.ts',
    'contracts/tooling/generate/apply-response-enum-fallback-core.spec.ts',
    'contracts/tooling/generate/events-catalog.spec.ts',
    'contracts/tooling/compat/check-compatibility.sh',
    'contracts/tooling/portal/build-portal.ts',
    'contracts/tooling/portal/portal-core.ts',
    'contracts/events/README.md',
    'contracts/events/asyncapi.yaml',
    'contracts/apis/library/catalog-info.yaml',
    'contracts/events/loan.created/catalog-info.yaml',
    'contracts/packages/api-types/catalog-info.yaml',
    'contracts/catalog/teams.yaml',
    'contracts/packages/domain/stryker.config.mjs',
    'contracts/packages/unknown/src/index.ts',
    'contracts/redocly.yaml',
    'apps/api/src/main.ts',
  ])('%s affects no published package', (path) => {
    expect(packagesAffectedBy(path)).toEqual([]);
  });
});

describe('packagesInChangeset', () => {
  it('reads the packages from the front matter, with any quoting', () => {
    const content = `---\n'@acme/api-types': minor\n"@acme/api-client": minor\n@acme/domain: patch\n---\n\nText with '@acme/events': mentioned.\n`;

    expect(packagesInChangeset(content)).toEqual([
      '@acme/api-types',
      '@acme/api-client',
      '@acme/domain',
    ]);
  });

  it('finds nothing without front matter', () => {
    expect(packagesInChangeset('just text')).toEqual([]);
  });
});

describe('checkChangesets', () => {
  it('lists the affected packages a changeset does not cover', () => {
    expect(
      checkChangesets(
        ['contracts/apis/library/paths/v1-books.yaml', 'contracts/packages/domain/src/loan.ts'],
        ["---\n'@acme/api-types': minor\n---\n"],
      ),
    ).toEqual({
      affected: ['@acme/api-client', '@acme/api-types', '@acme/domain'],
      covered: ['@acme/api-types'],
      missing: ['@acme/api-client', '@acme/domain'],
    });
  });

  it('passes when nothing published is affected', () => {
    expect(checkChangesets(['apps/web/src/App.tsx'], [])).toEqual({
      affected: [],
      covered: [],
      missing: [],
    });
  });
});
