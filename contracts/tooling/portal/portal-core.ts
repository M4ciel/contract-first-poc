/**
 * Developer portal: static pages generated from the software catalog (Backstage descriptors), the
 * contract bundles and the published packages. Pure: build-portal.ts reads the files and writes the
 * pages. Nothing here is written by hand that the repository already knows.
 */
import { PORTAL_STYLE } from './portal-style.ts';

export const GENERATED_FROM = 'acme.test/generated-from';

/** Browser libraries: exact versions from a CDN, refused by the browser if their content changes. */
export const CDN = {
  scalar: {
    src: 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.76.0/dist/browser/standalone.js',
    integrity: 'sha384-oH1C0RwqcwbVXkC+r8A+4qRoyEUQdtxAzOwumkxZtQBBcsy61FOoPt7B50OVJYYQ',
  },
  asyncapi: {
    src: 'https://cdn.jsdelivr.net/npm/@asyncapi/react-component@3.2.2/browser/standalone/index.js',
    integrity: 'sha384-/OTzBCE2fCs+wXFZecqj96eHeOnof8fcoSA2OVEHTmV/BeGnpOpolyhDGduFU9xE',
  },
  asyncapiStyle: {
    src: 'https://cdn.jsdelivr.net/npm/@asyncapi/react-component@3.2.2/styles/default.min.css',
    integrity: 'sha384-oo9RoQcacP++XdMX6CjTucTvASEORHX3chFik0/V2kHcsHiVboGyWZztGeq/0bum',
  },
  mermaid: {
    src: 'https://cdn.jsdelivr.net/npm/mermaid@12.2.0/dist/mermaid.min.js',
    integrity: 'sha384-8xUhuLNMjW/cI2Dacg3DR4WliYznvIg0LVG1stctThKD/YVrJFI9TNCFxft5NYgp',
  },
  marked: {
    src: 'https://cdn.jsdelivr.net/npm/marked@18.1.2/lib/marked.umd.js',
    integrity: 'sha384-nCN5FOaVTXXYilftBH/VQuC9ypBYOxrctAZn2x7ggYClXaporWSzM0y+ODhb8MTi',
  },
} as const;

export interface CatalogEntity {
  readonly kind: string;
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly type: string;
  readonly lifecycle: string;
  readonly owner: string;
  readonly system: string;
  readonly domain: string;
  readonly providesApis: readonly string[];
  readonly consumesApis: readonly string[];
  readonly dependsOn: readonly string[];
  readonly generatedFrom: readonly string[];
}

export interface Operation {
  readonly method: string;
  readonly path: string;
  readonly operationId: string;
  readonly summary: string;
  readonly stability: string;
  readonly deprecated: boolean;
}

export interface PackageInfo {
  readonly version: string;
  readonly readme: string;
  readonly changelog: string;
}

export interface PortalInput {
  readonly entities: readonly CatalogEntity[];
  /** OpenAPI operations per API entity name. */
  readonly operations: Readonly<Record<string, readonly Operation[]>>;
  /** Bundled definition (YAML) per API entity name. */
  readonly definitions: Readonly<Record<string, string>>;
  /** Published package details per library component name. */
  readonly packages: Readonly<Record<string, PackageInfo>>;
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
/** `group:default/team-a` → `team-a`. */
const nameOf = (ref: string): string => ref.replace(/^[a-z]+:/i, '').replace(/^default\//, '');

/** A parsed Backstage descriptor, reduced to what the portal shows. */
export const toCatalogEntity = (raw: Record<string, unknown>): CatalogEntity => {
  const metadata = (raw['metadata'] ?? {}) as Record<string, unknown>;
  const spec = (raw['spec'] ?? {}) as Record<string, unknown>;
  const annotations = (metadata['annotations'] ?? {}) as Record<string, unknown>;
  const name = text(metadata['name']);
  return {
    kind: text(raw['kind']),
    name,
    title: text(metadata['title']) || name,
    description: text(metadata['description']),
    tags: strings(metadata['tags']),
    type: text(spec['type']),
    lifecycle: text(spec['lifecycle']),
    owner: nameOf(text(spec['owner'])),
    system: nameOf(text(spec['system'])),
    domain: nameOf(text(spec['domain'])),
    providesApis: strings(spec['providesApis']).map(nameOf),
    consumesApis: strings(spec['consumesApis']).map(nameOf),
    dependsOn: strings(spec['dependsOn']).map(nameOf),
    generatedFrom: text(annotations[GENERATED_FROM])
      .split(',')
      .map((ref) => nameOf(ref.trim()))
      .filter(Boolean),
  };
};

const METHODS = ['get', 'put', 'post', 'delete', 'patch', 'head', 'options', 'trace'];

/** Operations of a bundled OpenAPI document, in document order. */
export const toOperations = (openapi: Record<string, unknown>): Operation[] =>
  Object.entries((openapi['paths'] ?? {}) as Record<string, Record<string, unknown>>).flatMap(
    ([path, item]) =>
      Object.entries(item)
        .filter(([method]) => METHODS.includes(method))
        .map(([method, value]) => {
          const operation = value as Record<string, unknown>;
          return {
            method: method.toUpperCase(),
            path,
            operationId: text(operation['operationId']),
            summary: text(operation['summary']),
            stability: text(operation['x-stability-level']) || 'stable',
            deprecated: operation['deprecated'] === true,
          };
        }),
  );

export const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

/** A value embedded in an inline script: `</script>` inside it would end the element early. */
export const scriptJson = (value: unknown): string =>
  JSON.stringify(value).replaceAll('</', '<\\/');

const PAGES: Record<string, (name: string) => string> = {
  api: (name) => `api-${name}.html`,
  component: (name) => `component-${name}.html`,
  group: (name) => `index.html#team-${name}`,
  system: (name) => `index.html#system-${name}`,
};
export const pageOf = (kind: string, name: string): string => {
  const page = PAGES[kind.toLowerCase()];
  return page ? page(name) : `component-${name}.html`;
};

const linkTo = (portal: Portal, kind: string, name: string): string => {
  const entity = portal.find(kind, name);
  return `<a href="${pageOf(kind, name)}">${escapeHtml(entity?.title ?? name)}</a>`;
};

const badge = (label: string, tone = label): string =>
  label ? `<span class="badge badge-${escapeHtml(tone)}">${escapeHtml(label)}</span>` : '';

/** The catalog with its relations resolved in both directions. */
export class Portal {
  private readonly input: PortalInput;

  constructor(input: PortalInput) {
    this.input = input;
  }

  get entities(): readonly CatalogEntity[] {
    return this.input.entities;
  }

  of(kind: string): CatalogEntity[] {
    return this.input.entities.filter((entity) => entity.kind === kind);
  }

  find(kind: string, name: string): CatalogEntity | undefined {
    return this.input.entities.find(
      (entity) => entity.kind.toLowerCase() === kind.toLowerCase() && entity.name === name,
    );
  }

  providersOf(api: string): CatalogEntity[] {
    return this.of('Component').filter((component) => component.providesApis.includes(api));
  }

  consumersOf(api: string): CatalogEntity[] {
    return this.of('Component').filter((component) => component.consumesApis.includes(api));
  }

  dependentsOf(component: string): CatalogEntity[] {
    return this.of('Component').filter((other) => other.dependsOn.includes(component));
  }

  packagesOf(api: string): CatalogEntity[] {
    return this.of('Component').filter((component) => component.generatedFrom.includes(api));
  }

  packageInfo(component: string): PackageInfo | undefined {
    return this.input.packages[component];
  }

  operations(api: string): readonly Operation[] {
    return this.input.operations[api] ?? [];
  }

  definition(api: string): string | undefined {
    return this.input.definitions[api];
  }

  ownedBy(team: string): CatalogEntity[] {
    return this.input.entities.filter(
      (entity) => entity.owner === team && entity.kind !== 'Domain',
    );
  }

  inSystem(system: string): CatalogEntity[] {
    return this.input.entities.filter((entity) => entity.system === system);
  }
}

const layout = (title: string, body: string, head: string): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} · Acme developer portal</title>
    <style>${PORTAL_STYLE}</style>
    ${head}
  </head>
  <body>
    <header class="top"><a class="brand" href="index.html">Acme developer portal</a></header>
    <main>
${body}
    </main>
    <footer>Generated from the repository: the software catalog, the contracts and the packages.</footer>
  </body>
</html>
`;

const script = (library: { src: string; integrity: string }): string =>
  `<script src="${library.src}" integrity="${library.integrity}" crossorigin="anonymous"></script>`;

const list = (portal: Portal, kind: string, names: readonly string[]): string =>
  names.length === 0
    ? '<span class="muted">none</span>'
    : names.map((name) => linkTo(portal, kind, name)).join(', ');

const entityList = (portal: Portal, entities: readonly CatalogEntity[]): string =>
  list(
    portal,
    'component',
    entities.map((entity) => entity.name),
  );

const facts = (rows: Array<[string, string]>): string =>
  `<dl class="facts">${rows.map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join('')}</dl>`;

const header = (entity: CatalogEntity, kindLabel: string): string => `
      <p class="eyebrow">${escapeHtml(kindLabel)}</p>
      <h1>${escapeHtml(entity.title)} ${badge(entity.lifecycle)}</h1>
      <p class="lead">${escapeHtml(entity.description)}</p>
      <p>${entity.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join(' ')}</p>`;

/** Mermaid graph: who provides and who consumes each API. */
export const relationsGraph = (portal: Portal): string => {
  const id = (kind: string, name: string) => `${kind}_${name.replaceAll('-', '_')}`;
  const label = (entity: CatalogEntity) => entity.title.replaceAll('"', "'");
  const lines = ['flowchart LR'];
  for (const api of portal.of('API')) lines.push(`  ${id('api', api.name)}(["${label(api)}"])`);
  for (const component of portal.of('Component').filter((entity) => entity.type !== 'library')) {
    lines.push(`  ${id('component', component.name)}["${label(component)}"]`);
    for (const api of component.providesApis) {
      lines.push(`  ${id('component', component.name)} -->|provides| ${id('api', api)}`);
    }
    for (const api of component.consumesApis) {
      lines.push(`  ${id('component', component.name)} -.->|consumes| ${id('api', api)}`);
    }
  }
  return lines.join('\n');
};

const card = (portal: Portal, entity: CatalogEntity): string => `
          <a class="card" href="${pageOf(entity.kind, entity.name)}">
            <span class="card-kind">${escapeHtml(entity.kind === 'API' ? `${entity.type} API` : entity.type)}</span>
            <strong>${escapeHtml(entity.title)}</strong> ${badge(entity.lifecycle)}
            <span>${escapeHtml(entity.description)}</span>
            <span class="muted">Owner: ${escapeHtml(portal.find('group', entity.owner)?.title ?? entity.owner)}</span>
          </a>`;

const REGISTRY = `# .npmrc: the @acme packages live in the private registry
@acme:registry=http://localhost:4873/`;

export const renderIndex = (portal: Portal): string => {
  const systems = portal
    .of('System')
    .map((system) => {
      const members = portal.inSystem(system.name);
      return `
      <section id="system-${escapeHtml(system.name)}">
        <h2>${escapeHtml(system.title)} <span class="muted">system</span></h2>
        <p>${escapeHtml(system.description)} Owner: ${linkTo(portal, 'group', system.owner)}.</p>
        <div class="cards">${members
          .filter((entity) => entity.kind === 'API')
          .concat(members.filter((entity) => entity.kind === 'Component'))
          .map((entity) => card(portal, entity))
          .join('')}
        </div>
      </section>`;
    })
    .join('');
  const teams = portal
    .of('Group')
    .map(
      (team) => `
        <li id="team-${escapeHtml(team.name)}"><strong>${escapeHtml(team.title)}</strong>: ${escapeHtml(team.description)}<br />
          Owns: ${portal
            .ownedBy(team.name)
            .filter((entity) => entity.kind === 'API' || entity.kind === 'Component')
            .map((entity) => linkTo(portal, entity.kind, entity.name))
            .join(', ')}</li>`,
    )
    .join('');
  const count = (kind: string) => portal.of(kind).length;
  const body = `
      <section class="hero">
        <h1>Acme developer portal</h1>
        <p class="lead">Every API, event, service and package of the lending domain: who owns it, who
          uses it, how to consume it. Generated from the contracts and the software catalog on every
          change, so it cannot drift from the code.</p>
        <p class="stats">${count('API')} APIs and events · ${count('Component')} components · ${count('System')} systems · ${count('Group')} teams</p>
      </section>
      <section>
        <h2>Getting started</h2>
        <ol>
          <li>Find the API or event you need below and read its page: owner, stability, operations or channels.</li>
          <li>Point npm at the private registry and install the generated package listed on that page.</li>
          <li>Never hand-write a client: the packages are generated from the contract, with mocks to work without a backend.</li>
        </ol>
        <pre><code>${escapeHtml(REGISTRY)}</code></pre>
      </section>${systems}
      <section>
        <h2>Who talks to whom</h2>
        <pre class="mermaid">${escapeHtml(relationsGraph(portal))}</pre>
      </section>
      <section>
        <h2>Teams</h2>
        <ul class="teams">${teams}
        </ul>
      </section>`;
  return layout(
    'Home',
    body,
    `${script(CDN.mermaid)}
    <script>mermaid.initialize({ startOnLoad: true, theme: 'neutral' });</script>`,
  );
};

const operationsTable = (operations: readonly Operation[]): string => `
      <div class="table-wrap"><table>
        <thead><tr><th>Operation</th><th>Stability</th><th>operationId</th><th>Summary</th></tr></thead>
        <tbody>${operations
          .map(
            (operation) => `
          <tr${operation.deprecated ? ' class="deprecated"' : ''}>
            <td><code><span class="method method-${operation.method.toLowerCase()}">${operation.method}</span> ${escapeHtml(operation.path)}</code></td>
            <td>${badge(operation.stability)}${operation.deprecated ? ` ${badge('deprecated')}` : ''}</td>
            <td><code>${escapeHtml(operation.operationId)}</code></td>
            <td>${escapeHtml(operation.summary)}</td>
          </tr>`,
          )
          .join('')}
        </tbody>
      </table></div>`;

export const renderApi = (portal: Portal, api: CatalogEntity): string => {
  const packages = portal.packagesOf(api.name);
  const consume =
    packages.length === 0
      ? '<p class="muted">No generated package.</p>'
      : `
      <p>Install the generated ${packages.length === 1 ? 'package' : 'packages'} (see each one for usage):</p>
      <pre><code>${escapeHtml(`${REGISTRY}\n\npnpm add ${packages.map((entity) => entity.title).join(' ')}`)}</code></pre>
      <ul>${packages
        .map(
          (entity) =>
            `<li>${linkTo(portal, 'component', entity.name)} <span class="muted">${escapeHtml(portal.packageInfo(entity.name)?.version ?? '')}</span>: ${escapeHtml(entity.description)}</li>`,
        )
        .join('')}</ul>`;
  const definition = portal.definition(api.name) ?? '';
  const details =
    api.type === 'openapi'
      ? `
      <h2>Operations</h2>
      <p>Only <strong>stable</strong> and <strong>beta</strong> operations are protected against breaking changes; <strong>alpha</strong> and <strong>draft</strong> may change freely.
        <a href="reference-${escapeHtml(api.name)}.html">Open the interactive reference →</a></p>
      ${operationsTable(portal.operations(api.name))}`
      : `
      <h2>Channels and messages</h2>
      <p class="muted">Rendered from the AsyncAPI document.</p>
      <div id="asyncapi"></div>
      ${script(CDN.asyncapi)}
      <script>
        AsyncApiStandalone.render(
          { schema: ${scriptJson(definition)}, config: { show: { sidebar: false, info: false, servers: false, schemas: false } } },
          document.getElementById('asyncapi'),
        );
      </script>`;
  const body = `
      ${header(api, api.type === 'openapi' ? 'HTTP API · OpenAPI' : 'Event · AsyncAPI')}
      ${facts([
        ['Owner', linkTo(portal, 'group', api.owner)],
        ['System', linkTo(portal, 'system', api.system)],
        ['Provided by', entityList(portal, portal.providersOf(api.name))],
        ['Consumed by', entityList(portal, portal.consumersOf(api.name))],
      ])}
      <h2>How to consume it</h2>${consume}${details}`;
  const head =
    api.type === 'openapi'
      ? ''
      : `<link rel="stylesheet" href="${CDN.asyncapiStyle.src}" integrity="${CDN.asyncapiStyle.integrity}" crossorigin="anonymous" />`;
  return layout(api.title, body, head);
};

/** Scalar's interactive reference of one OpenAPI document. */
export const renderReference = (api: CatalogEntity, definition: string): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(api.title)} reference · Acme developer portal</title>
  </head>
  <body>
    <div id="app"></div>
    ${script(CDN.scalar)}
    <script>
      Scalar.createApiReference('#app', ${scriptJson({ content: definition, theme: 'default', hideClientButton: true })});
    </script>
  </body>
</html>
`;

/** The page already shows the title: drop the document's own `# Title` line. */
export const withoutTitle = (source: string): string => source.replace(/^# .*\n+/, '');

const markdown = (id: string, source: string): string =>
  `<div class="markdown" id="${id}"></div>
      <script>document.getElementById('${id}').innerHTML = marked.parse(${scriptJson(withoutTitle(source))});</script>`;

// GFM turns `@acme/api-types@0.1.0` into an e-mail link; package names are never addresses.
const MARKED_SETUP = `<script>
      marked.use({ renderer: { link: (token) => (token.href.startsWith('mailto:') ? token.text : false) } });
    </script>`;

export const renderComponent = (portal: Portal, component: CatalogEntity): string => {
  const info = portal.packageInfo(component.name);
  const kindLabel =
    { library: 'Package', service: 'Service', website: 'Web app' }[component.type] ?? 'Component';
  const rows: Array<[string, string]> = [
    ['Owner', linkTo(portal, 'group', component.owner)],
    ['System', linkTo(portal, 'system', component.system)],
  ];
  if (info) rows.push(['Version', `<code>${escapeHtml(info.version)}</code>`]);
  if (component.generatedFrom.length > 0) {
    rows.push(['Generated from', list(portal, 'api', component.generatedFrom)]);
  }
  if (component.type !== 'library') {
    rows.push(['Provides', list(portal, 'api', component.providesApis)]);
    rows.push(['Consumes', list(portal, 'api', component.consumesApis)]);
  }
  rows.push(['Depends on', list(portal, 'component', component.dependsOn)]);
  rows.push(['Used by', entityList(portal, portal.dependentsOf(component.name))]);
  const docs = info
    ? `
      <h2>README</h2>
      ${markdown('readme', info.readme)}
      <h2>Changelog</h2>
      ${markdown('changelog', info.changelog)}`
    : '';
  return layout(
    component.title,
    `
      ${header(component, kindLabel)}
      ${facts(rows)}${docs}`,
    info ? `${script(CDN.marked)}\n    ${MARKED_SETUP}` : '',
  );
};

/** Every page of the portal, by file name. */
export const renderPortal = (input: PortalInput): Record<string, string> => {
  const portal = new Portal(input);
  const pages: Record<string, string> = { 'index.html': renderIndex(portal) };
  for (const api of portal.of('API')) {
    pages[pageOf('api', api.name)] = renderApi(portal, api);
    const definition = portal.definition(api.name);
    if (api.type === 'openapi' && definition !== undefined) {
      pages[`reference-${api.name}.html`] = renderReference(api, definition);
    }
  }
  for (const component of portal.of('Component')) {
    pages[pageOf('component', component.name)] = renderComponent(portal, component);
  }
  return pages;
};
