// Usage (from the workspace root): node tools/src/catalog-check.ts
// Fails when the software catalog (Backstage descriptors) drifts from the repository.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { parseAllDocuments } from 'yaml';
import { checkCatalog, type Entity, type LoadedEntity } from './catalog-check-core.ts';

const ROOT_LOCATION = 'catalog-info.yaml';

const folders = (parent: string) =>
  readdirSync(parent, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `${parent}/${entry.name}`)
    .sort();

const problems: string[] = [];
const load = (file: string): LoadedEntity[] =>
  parseAllDocuments(readFileSync(file, 'utf8')).flatMap((document) => {
    if (document.errors.length > 0) {
      problems.push(...document.errors.map((error) => `${file}: ${error.message}`));
      return [];
    }
    return [{ file, entity: document.toJS() as Entity }];
  });

const projectFolders = [...folders('apps'), ...folders('contracts/packages')];
const descriptorFiles = [
  ...readdirSync('contracts/catalog')
    .filter((file) => file.endsWith('.yaml'))
    .map((file) => `contracts/catalog/${file}`),
  ...[...folders('contracts/apis'), ...folders('contracts/events'), ...projectFolders].map(
    (folder) => `${folder}/catalog-info.yaml`,
  ),
]
  .filter((file) => existsSync(file))
  .sort();

const [location] = load(ROOT_LOCATION);
const entities = descriptorFiles.flatMap(load);
if (!location || location.entity.kind !== 'Location') {
  problems.push(`${ROOT_LOCATION}: must be a Location listing every descriptor`);
} else {
  problems.push(
    ...checkCatalog(location, entities, {
      exists: existsSync,
      descriptorFiles,
      openapiFiles: folders('contracts/apis').map((folder) => `${folder}/openapi.yaml`),
      eventFolders: folders('contracts/events'),
      projects: projectFolders.map((folder) => {
        const manifest = JSON.parse(readFileSync(`${folder}/package.json`, 'utf8')) as {
          name: string;
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        return {
          folder,
          name: manifest.name,
          acmeDependencies: Object.keys({
            ...manifest.dependencies,
            ...manifest.devDependencies,
          }).filter((name) => name.startsWith('@acme/')),
        };
      }),
    }),
  );
}

if (problems.length > 0) {
  console.error(`✖ Software catalog:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
const count = (kind: string) => entities.filter(({ entity }) => entity.kind === kind).length;
console.log(
  `✔ Software catalog: ${count('API')} APIs, ${count('Component')} components, ${count('System')} systems, ${count('Group')} teams; every reference resolves.`,
);
