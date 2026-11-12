import {
  API_VERSION,
  checkCatalog,
  checkEntity,
  type Entity,
  type LoadedEntity,
  parseRef,
  type RepositoryFacts,
} from './catalog-check-core.ts';

const entity = (
  file: string,
  kind: string,
  name: string,
  spec: Record<string, unknown> = {},
  title?: string,
): LoadedEntity => ({
  file,
  entity: {
    apiVersion: API_VERSION,
    kind,
    metadata: { name, title, description: `The ${name}.` },
    spec,
  },
});

const location = entity('catalog-info.yaml', 'Location', 'root', {
  targets: [
    './contracts/catalog/catalog.yaml',
    './contracts/apis/books/catalog-info.yaml',
    './contracts/events/book.added/catalog-info.yaml',
    './contracts/packages/types/catalog-info.yaml',
    './apps/backend/catalog-info.yaml',
  ],
});

const catalog = (): LoadedEntity[] => [
  entity('contracts/catalog/catalog.yaml', 'Group', 'team-a', { type: 'team', children: [] }),
  entity('contracts/catalog/catalog.yaml', 'Domain', 'shop', { owner: 'team-a' }),
  entity('contracts/catalog/catalog.yaml', 'System', 'books', {
    owner: 'group:team-a',
    domain: 'shop',
  }),
  entity('contracts/apis/books/catalog-info.yaml', 'API', 'books-api', {
    type: 'openapi',
    lifecycle: 'production',
    owner: 'team-a',
    system: 'books',
    definition: { $text: './openapi.yaml' },
  }),
  entity('contracts/events/book.added/catalog-info.yaml', 'API', 'book-added', {
    type: 'json-schema',
    lifecycle: 'production',
    owner: 'team-a',
    system: 'books',
    definition: { $text: './v1.schema.json' },
  }),
  entity(
    'contracts/packages/types/catalog-info.yaml',
    'Component',
    'acme-types',
    { type: 'library', lifecycle: 'production', owner: 'team-a', system: 'books', dependsOn: [] },
    '@acme/types',
  ),
  entity('apps/backend/catalog-info.yaml', 'Component', 'backend', {
    type: 'service',
    lifecycle: 'production',
    owner: 'team-a',
    system: 'system:default/books',
    providesApis: ['books-api', 'api:book-added'],
    dependsOn: ['component:acme-types'],
  }),
];

const facts = (overrides: Partial<RepositoryFacts> = {}): RepositoryFacts => ({
  exists: (file) =>
    ['contracts/apis/books/openapi.yaml', 'contracts/events/book.added/v1.schema.json'].includes(
      file,
    ),
  descriptorFiles: [
    'apps/backend/catalog-info.yaml',
    'contracts/apis/books/catalog-info.yaml',
    'contracts/catalog/catalog.yaml',
    'contracts/events/book.added/catalog-info.yaml',
    'contracts/packages/types/catalog-info.yaml',
  ],
  openapiFiles: ['contracts/apis/books/openapi.yaml'],
  eventFolders: ['contracts/events/book.added'],
  projects: [
    { folder: 'contracts/packages/types', name: '@acme/types', acmeDependencies: [] },
    { folder: 'apps/backend', name: '@acme/backend', acmeDependencies: ['@acme/types'] },
  ],
  ...overrides,
});

const replace = (entities: LoadedEntity[], name: string, change: (entity: Entity) => Entity) =>
  entities.map((loaded) =>
    loaded.entity.metadata?.name === name ? { ...loaded, entity: change(loaded.entity) } : loaded,
  );
const withSpec = (spec: Record<string, unknown>) => (current: Entity) => ({
  ...current,
  spec: { ...current.spec, ...spec },
});

describe('parseRef', () => {
  it.each([
    ['team-a', 'group:team-a'],
    ['group:team-a', 'group:team-a'],
    ['Group:default/team-a', 'group:team-a'],
  ])('%s → %s', (ref, key) => {
    expect(parseRef(ref, 'group')).toBe(key);
  });
});

describe('checkEntity', () => {
  it('accepts a valid entity', () => {
    expect(catalog().flatMap(checkEntity)).toEqual([]);
  });

  it('reports the envelope, the name and the description', () => {
    expect(
      checkEntity({
        file: 'x.yaml',
        entity: {
          apiVersion: 'v1',
          kind: 'Template',
          metadata: { name: 'Bad_Name', description: ' ' },
        },
      }),
    ).toEqual([
      `x.yaml (Template Bad_Name): apiVersion must be ${API_VERSION}`,
      'x.yaml (Template Bad_Name): kind must be one of Location, Domain, System, Group, Component, API',
      'x.yaml (Template Bad_Name): metadata.name must be lowercase kebab-case',
      'x.yaml (Template Bad_Name): metadata.description is required',
    ]);
  });

  it('reports an entity without metadata or spec', () => {
    expect(
      checkEntity({ file: 'x.yaml', entity: { apiVersion: API_VERSION, kind: 'API' } }),
    ).toEqual([
      'x.yaml (API undefined): metadata.name must be lowercase kebab-case',
      'x.yaml (API undefined): metadata.description is required',
      'x.yaml (API undefined): spec.type must be one of openapi, asyncapi, json-schema',
      'x.yaml (API undefined): spec.lifecycle must be one of experimental, production, deprecated',
    ]);
  });

  it('checks the component type', () => {
    expect(
      checkEntity(entity('x.yaml', 'Component', 'job', { type: 'cron', lifecycle: 'production' })),
    ).toEqual(['x.yaml (Component job): spec.type must be one of service, website, library']);
  });
});

describe('checkCatalog', () => {
  it('accepts a complete catalog', () => {
    expect(checkCatalog(location, catalog(), facts())).toEqual([]);
  });

  it('accepts an entity without a spec when its kind needs none', () => {
    const group: LoadedEntity = {
      file: 'contracts/catalog/catalog.yaml',
      entity: {
        apiVersion: API_VERSION,
        kind: 'Group',
        metadata: { name: 'team-b', description: 'B.' },
      },
    };
    expect(checkCatalog(location, [...catalog(), group], facts())).toEqual([]);
  });

  it('reports duplicated entities', () => {
    const entities = catalog();
    expect(checkCatalog(location, [...entities, entities[0] as LoadedEntity], facts())).toEqual([
      'contracts/catalog/catalog.yaml: group:team-a is defined twice',
    ]);
  });

  it('reports references to entities that do not exist, and missing required fields', () => {
    const entities = replace(
      replace(catalog(), 'backend', withSpec({ owner: 'team-b', consumesApis: ['payments-api'] })),
      'books',
      withSpec({ domain: undefined }),
    );
    expect(checkCatalog(location, entities, facts())).toEqual([
      'contracts/catalog/catalog.yaml: spec.domain is required',
      'apps/backend/catalog-info.yaml: spec.owner group:team-b does not exist',
      'apps/backend/catalog-info.yaml: spec.consumesApis api:payments-api does not exist',
    ]);
  });

  it('keeps the root Location in sync with the descriptor files', () => {
    const files = facts().descriptorFiles;
    expect(
      checkCatalog(
        location,
        catalog(),
        facts({ descriptorFiles: [...files.slice(1), 'apps/web/catalog-info.yaml'] }),
      ),
    ).toEqual([
      'catalog-info.yaml: apps/web/catalog-info.yaml is not listed in spec.targets',
      'catalog-info.yaml: target apps/backend/catalog-info.yaml does not exist',
    ]);
  });

  it('accepts a Location without targets only when there is nothing to list', () => {
    const empty = { ...location, entity: { ...location.entity, spec: {} } };
    expect(
      checkCatalog(
        empty,
        [],
        facts({ descriptorFiles: [], openapiFiles: [], eventFolders: [], projects: [] }),
      ),
    ).toEqual([]);
  });

  it('requires an existing definition and exactly one provider for every API', () => {
    const entities = replace(
      replace(catalog(), 'books-api', withSpec({ definition: { $text: './missing.yaml' } })),
      'backend',
      withSpec({ providesApis: ['books-api'] }),
    );
    expect(checkCatalog(location, entities, facts())).toEqual([
      'contracts/apis/books/catalog-info.yaml: spec.definition.$text must point to an existing file',
      'contracts/events/book.added/catalog-info.yaml: api:book-added must be provided by exactly one component (found 0)',
      'contracts/apis/books/openapi.yaml: no API entity uses it as its definition',
    ]);
  });

  it('reports an API without a definition', () => {
    const entities = replace(catalog(), 'book-added', withSpec({ definition: undefined }));
    expect(checkCatalog(location, entities, facts())).toEqual([
      'contracts/events/book.added/catalog-info.yaml: spec.definition.$text must point to an existing file',
    ]);
  });

  it('requires a descriptor for every event folder', () => {
    expect(
      checkCatalog(
        location,
        catalog(),
        facts({ eventFolders: ['contracts/events/book.added', 'contracts/events/book.removed'] }),
      ),
    ).toEqual(['contracts/events/book.removed: the event has no catalog-info.yaml']);
  });

  it('requires a component for every app and package, named after the package', () => {
    const entities = replace(catalog(), 'acme-types', (current) => ({
      ...current,
      metadata: { ...current.metadata, title: 'types' },
    }));
    const projects = [
      ...facts().projects,
      { folder: 'apps/web', name: '@acme/web', acmeDependencies: [] },
    ];
    expect(checkCatalog(location, entities, facts({ projects }))).toEqual([
      'contracts/packages/types/catalog-info.yaml: metadata.title must be the package name @acme/types',
      'apps/backend/catalog-info.yaml: spec.dependsOn must match the @acme dependencies of package.json: [(no library component for @acme/types)]',
      'apps/web: @acme/web has no catalog-info.yaml',
    ]);
  });

  it('keeps dependsOn equal to the @acme dependencies of package.json', () => {
    const entities = replace(catalog(), 'backend', withSpec({ dependsOn: undefined }));
    expect(checkCatalog(location, entities, facts())).toEqual([
      'apps/backend/catalog-info.yaml: spec.dependsOn must match the @acme dependencies of package.json: [component:acme-types]',
    ]);
  });
});
