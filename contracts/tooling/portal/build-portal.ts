/**
 * Developer portal: contracts/artifacts/portal/*.html, generated from the software catalog (the
 * root catalog-info.yaml and every descriptor it lists), the contract bundles and the packages.
 * Open artifacts/portal/index.html in a browser; nothing is served or uploaded here.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { parse, parseAllDocuments } from 'yaml';
import {
  type CatalogEntity,
  type Operation,
  type PackageInfo,
  renderPortal,
  toCatalogEntity,
  toOperations,
} from './portal-core.ts';

const contracts = join(import.meta.dirname, '..', '..');
const root = join(contracts, '..');
const output = join(contracts, 'artifacts', 'portal');

const readYaml = (file: string) =>
  parseAllDocuments(readFileSync(file, 'utf8')).map((doc) => doc.toJS() as Record<string, unknown>);

// The root Location lists every descriptor; `@acme/tools:catalog-check` keeps that list complete.
const [location] = readYaml(join(root, 'catalog-info.yaml'));
const targets = ((location?.['spec'] as { targets?: string[] } | undefined)?.targets ?? []).map(
  (target) => join(root, target),
);
const loaded = targets.flatMap((file) => readYaml(file).map((raw) => ({ file, raw })));
const entities: CatalogEntity[] = loaded.map(({ raw }) => toCatalogEntity(raw));

// Every contract is bundled by Redocly into one self-contained file: definition → bundle.
const redocly = parse(readFileSync(join(contracts, 'redocly.yaml'), 'utf8')) as {
  apis: Record<string, { root: string; output: string }>;
};
const bundles = new Map(
  Object.values(redocly.apis).map(({ root: api, output: bundle }) => [
    join(contracts, api),
    join(contracts, bundle),
  ]),
);

const operations: Record<string, Operation[]> = {};
const definitions: Record<string, string> = {};
const packages: Record<string, PackageInfo> = {};
for (const { file, raw } of loaded) {
  const entity = toCatalogEntity(raw);
  const folder = dirname(file);
  if (entity.kind === 'API') {
    const definition = join(
      folder,
      String((raw['spec'] as { definition: { $text: string } }).definition.$text),
    );
    const bundle = bundles.get(definition);
    if (bundle === undefined || !existsSync(bundle)) {
      throw new Error(
        `${relative(root, definition)} has no bundle: list it in redocly.yaml and run contracts:bundle`,
      );
    }
    const source = readFileSync(bundle, 'utf8');
    definitions[entity.name] = source;
    if (entity.type === 'openapi')
      operations[entity.name] = toOperations(parse(source) as Record<string, unknown>);
  }
  if (entity.kind === 'Component' && entity.type === 'library') {
    const manifest = JSON.parse(readFileSync(join(folder, 'package.json'), 'utf8')) as {
      version: string;
    };
    const optional = (name: string) =>
      existsSync(join(folder, name)) ? readFileSync(join(folder, name), 'utf8') : '';
    packages[entity.name] = {
      version: manifest.version,
      readme: optional('README.md'),
      changelog: optional('CHANGELOG.md'),
    };
  }
}

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
const pages = renderPortal({ entities, operations, definitions, packages });
for (const [name, html] of Object.entries(pages)) writeFileSync(join(output, name), html);
console.log(
  `[portal] ${relative(contracts, output)}/index.html (${Object.keys(pages).length} pages)`,
);
