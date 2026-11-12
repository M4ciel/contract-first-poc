import {
  type CatalogEntity,
  CDN,
  escapeHtml,
  GENERATED_FROM,
  Portal,
  type PortalInput,
  pageOf,
  relationsGraph,
  renderApi,
  renderComponent,
  renderIndex,
  renderPortal,
  renderReference,
  scriptJson,
  toCatalogEntity,
  toOperations,
  withoutTitle,
} from './portal-core.ts';

const entity = (overrides: Partial<CatalogEntity>): CatalogEntity => ({
  kind: 'Component',
  name: 'x',
  title: 'X',
  description: 'An x.',
  tags: [],
  type: 'service',
  lifecycle: 'production',
  owner: 'team-a',
  system: 'books',
  domain: '',
  providesApis: [],
  consumesApis: [],
  dependsOn: [],
  generatedFrom: [],
  ...overrides,
});

const input = (overrides: Partial<PortalInput> = {}): PortalInput => ({
  entities: [
    entity({
      kind: 'Group',
      name: 'team-a',
      title: 'Team A',
      description: 'Owns books.',
      type: 'team',
      system: '',
    }),
    entity({
      kind: 'System',
      name: 'books',
      title: 'Books',
      description: 'Books.',
      type: '',
      system: '',
    }),
    entity({ kind: 'API', name: 'books-api', title: 'Books API', type: 'openapi', tags: ['rest'] }),
    entity({ kind: 'API', name: 'book-added', title: 'book.added', type: 'asyncapi' }),
    entity({
      name: 'backend',
      title: 'Backend',
      providesApis: ['books-api', 'book-added'],
      dependsOn: ['acme-types'],
    }),
    entity({
      name: 'web',
      title: 'Web "app"',
      type: 'website',
      consumesApis: ['books-api'],
      dependsOn: ['acme-types', 'acme-client'],
    }),
    entity({
      name: 'acme-types',
      title: '@acme/types',
      type: 'library',
      generatedFrom: ['books-api'],
    }),
    entity({
      name: 'acme-client',
      title: '@acme/client',
      type: 'library',
      generatedFrom: ['books-api'],
      dependsOn: ['acme-types'],
    }),
    entity({
      name: 'acme-events',
      title: '@acme/events',
      type: 'library',
      generatedFrom: ['book-added'],
    }),
  ],
  operations: {
    'books-api': [
      {
        method: 'GET',
        path: '/v1/books',
        operationId: 'listBooks',
        summary: 'List books',
        stability: 'stable',
        deprecated: false,
      },
      {
        method: 'GET',
        path: '/v2/books',
        operationId: 'listBooksV2',
        summary: 'Preview',
        stability: 'alpha',
        deprecated: true,
      },
    ],
  },
  definitions: { 'books-api': 'openapi: 3.1.0', 'book-added': 'asyncapi: 3.0.0\n# </script>' },
  packages: {
    'acme-types': {
      version: '1.2.0',
      readme: '# @acme/types\n\nUse it.',
      changelog: '# @acme/types\n\n## 1.2.0',
    },
  },
  ...overrides,
});

describe('toCatalogEntity', () => {
  it('reduces a descriptor to what the portal shows', () => {
    expect(
      toCatalogEntity({
        kind: 'Component',
        metadata: {
          name: 'acme-types',
          title: '@acme/types',
          description: 'Types.',
          tags: ['zod', 3],
          annotations: { [GENERATED_FROM]: 'api:books-api, book-added' },
        },
        spec: {
          type: 'library',
          lifecycle: 'production',
          owner: 'group:default/team-a',
          system: 'system:books',
          providesApis: ['api:books-api'],
          consumesApis: 'not a list',
          dependsOn: ['component:acme-domain'],
        },
      }),
    ).toEqual({
      kind: 'Component',
      name: 'acme-types',
      title: '@acme/types',
      description: 'Types.',
      tags: ['zod'],
      type: 'library',
      lifecycle: 'production',
      owner: 'team-a',
      system: 'books',
      domain: '',
      providesApis: ['books-api'],
      consumesApis: [],
      dependsOn: ['acme-domain'],
      generatedFrom: ['books-api', 'book-added'],
    });
  });

  it('falls back to the name as title, and to empty values', () => {
    expect(
      toCatalogEntity({ kind: 'Domain', metadata: { name: 'shop' }, spec: { domain: 'x' } }),
    ).toMatchObject({
      title: 'shop',
      description: '',
      domain: 'x',
      generatedFrom: [],
    });
    expect(toCatalogEntity({})).toMatchObject({ kind: '', name: '', title: '', tags: [] });
  });
});

describe('toOperations', () => {
  it('lists the operations with their stability, defaulting to stable', () => {
    expect(
      toOperations({
        paths: {
          '/v1/books': {
            parameters: [],
            get: { operationId: 'listBooks', summary: 'List', 'x-stability-level': 'beta' },
            post: { operationId: 'addBook', deprecated: true },
          },
        },
      }),
    ).toEqual([
      {
        method: 'GET',
        path: '/v1/books',
        operationId: 'listBooks',
        summary: 'List',
        stability: 'beta',
        deprecated: false,
      },
      {
        method: 'POST',
        path: '/v1/books',
        operationId: 'addBook',
        summary: '',
        stability: 'stable',
        deprecated: true,
      },
    ]);
  });

  it('is empty without paths', () => {
    expect(toOperations({})).toEqual([]);
  });
});

describe('helpers', () => {
  it('escapes HTML', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    );
  });

  it('keeps </script> from closing an inline script', () => {
    expect(scriptJson('a</script>')).toBe('"a<\\/script>"');
  });

  it('maps every kind to its page', () => {
    expect(
      ['API', 'component', 'group', 'system', 'Location'].map((kind) => pageOf(kind, 'n')),
    ).toEqual([
      'api-n.html',
      'component-n.html',
      'index.html#team-n',
      'index.html#system-n',
      'component-n.html',
    ]);
  });

  it('drops the document title of a Markdown file', () => {
    expect(withoutTitle('# @acme/types\n\nUse it.')).toBe('Use it.');
    expect(withoutTitle('No title.')).toBe('No title.');
  });
});

describe('Portal', () => {
  const portal = new Portal(input());

  it('resolves relations in both directions', () => {
    expect(portal.providersOf('books-api').map(({ name }) => name)).toEqual(['backend']);
    expect(portal.consumersOf('books-api').map(({ name }) => name)).toEqual(['web']);
    expect(portal.dependentsOf('acme-types').map(({ name }) => name)).toEqual([
      'backend',
      'web',
      'acme-client',
    ]);
    expect(portal.packagesOf('books-api').map(({ name }) => name)).toEqual([
      'acme-types',
      'acme-client',
    ]);
    expect(portal.ownedBy('team-a')).toHaveLength(9);
    expect(portal.inSystem('books')).toHaveLength(7);
    expect(portal.entities).toHaveLength(9);
  });

  it('has no operations or definition for an unknown API', () => {
    expect(portal.operations('nope')).toEqual([]);
    expect(portal.definition('nope')).toBeUndefined();
  });

  it('draws who provides and consumes each API, without the libraries', () => {
    expect(relationsGraph(portal)).toBe(
      [
        'flowchart LR',
        '  api_books_api(["Books API"])',
        '  api_book_added(["book.added"])',
        '  component_backend["Backend"]',
        '  component_backend -->|provides| api_books_api',
        '  component_backend -->|provides| api_book_added',
        `  component_web["Web 'app'"]`,
        '  component_web -.->|consumes| api_books_api',
      ].join('\n'),
    );
  });
});

describe('pages', () => {
  const portal = new Portal(input());
  const find = (name: string) =>
    portal.entities.find((candidate) => candidate.name === name) as CatalogEntity;

  it('renders the home page: systems, graph and teams', () => {
    const html = renderIndex(portal);
    expect(html).toContain('<section id="system-books">');
    expect(html).toContain('<span class="card-kind">openapi API</span>');
    expect(html).toContain('<span class="card-kind">library</span>');
    expect(html).toContain('Owner: Team A');
    expect(html).toContain('<li id="team-team-a">');
    expect(html).toContain('<pre class="mermaid">flowchart LR');
    expect(html).toContain(CDN.mermaid.integrity);
  });

  it('shows the owner name when the team is not in the catalog', () => {
    const lonely = new Portal(
      input({
        entities: [
          entity({ kind: 'System', name: 's', owner: 'ghost' }),
          entity({ system: 's', owner: 'ghost' }),
        ],
      }),
    );
    expect(renderIndex(lonely)).toContain('Owner: ghost');
  });

  it('renders an HTTP API: consumers, packages and operations', () => {
    const html = renderApi(portal, find('books-api'));
    expect(html).toContain('HTTP API · OpenAPI');
    expect(html).toContain('<a href="component-web.html">Web &quot;app&quot;</a>');
    expect(html).toContain('pnpm add @acme/types @acme/client');
    expect(html).toContain('Install the generated packages');
    expect(html).toContain('<span class="muted">1.2.0</span>');
    expect(html).toContain('<tr class="deprecated">');
    expect(html).toContain(
      '<span class="badge badge-alpha">alpha</span> <span class="badge badge-deprecated">deprecated</span>',
    );
    expect(html).toContain('href="reference-books-api.html"');
    expect(html).toContain('<span class="tag">rest</span>');
  });

  it('renders an event with the AsyncAPI viewer', () => {
    const html = renderApi(portal, find('book-added'));
    expect(html).toContain('Event · AsyncAPI');
    expect(html).toContain('Install the generated package (');
    expect(html).toContain('<span class="muted"></span>');
    expect(html).toContain('AsyncApiStandalone.render');
    expect(html).toContain('# <\\/script>');
    expect(html).toContain(CDN.asyncapiStyle.integrity);
    expect(html).toContain('Consumed by</dt><dd><span class="muted">none</span>');
  });

  it('renders an API without packages or definition', () => {
    const html = renderApi(
      new Portal(input({ definitions: {} })),
      entity({ kind: 'API', name: 'lonely', type: 'asyncapi', lifecycle: '' }),
    );
    expect(html).toContain('No generated package.');
    expect(html).toContain('schema: ""');
    expect(html).not.toContain('class="badge');
  });

  it('renders the interactive reference with Scalar', () => {
    const html = renderReference(find('books-api'), 'openapi: 3.1.0');
    expect(html).toContain(CDN.scalar.integrity);
    expect(html).toContain('"content":"openapi: 3.1.0"');
  });

  it('renders a package with its README and changelog', () => {
    const html = renderComponent(portal, find('acme-types'));
    expect(html).toContain('<p class="eyebrow">Package</p>');
    expect(html).toContain('<dt>Version</dt><dd><code>1.2.0</code></dd>');
    expect(html).toContain('<dt>Generated from</dt>');
    expect(html).not.toContain('<dt>Provides</dt>');
    expect(html).toContain('marked.parse("Use it.")');
    expect(html).toContain('marked.parse("## 1.2.0")');
    expect(html).toContain("token.href.startsWith('mailto:')");
  });

  it('renders a service and a component of an unknown type', () => {
    const service = renderComponent(portal, find('backend'));
    expect(service).toContain('<p class="eyebrow">Service</p>');
    expect(service).toContain('<dt>Provides</dt>');
    expect(service).not.toContain('marked');
    expect(renderComponent(portal, entity({ type: 'job' }))).toContain(
      '<p class="eyebrow">Component</p>',
    );
  });
});

describe('renderPortal', () => {
  it('writes a page per entity and a reference per OpenAPI definition', () => {
    expect(Object.keys(renderPortal(input())).sort()).toEqual([
      'api-book-added.html',
      'api-books-api.html',
      'component-acme-client.html',
      'component-acme-events.html',
      'component-acme-types.html',
      'component-backend.html',
      'component-web.html',
      'index.html',
      'reference-books-api.html',
    ]);
  });

  it('skips the reference of an OpenAPI API without a definition', () => {
    expect(Object.keys(renderPortal(input({ definitions: {} })))).not.toContain(
      'reference-books-api.html',
    );
  });
});
