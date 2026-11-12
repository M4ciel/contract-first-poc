/**
 * Event catalog generator: contracts/events/<event>/vN.schema.json → packages/events/src/generated
 * (@acme/events).
 * Runs as part of `contracts:generate`. Fails on any file that breaks the catalog rules.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { compile } from 'json-schema-to-typescript';
import { format, resolveConfig } from 'prettier';
import {
  checkEventSchema,
  eventNameFromFile,
  identifiers,
  type JsonSchema,
  renderEventModule,
  renderIndex,
} from './generate-events-core.ts';
import { listEventFiles } from './event-files.ts';

const root = join(import.meta.dirname, '..', '..');
const catalog = join(root, 'events');
const output = join(root, 'packages', 'events', 'src', 'generated');

const files = listEventFiles(catalog);

const problems: string[] = [];
const modules: Array<{ module: string; source: string }> = [];
for (const file of files) {
  const name = eventNameFromFile(file);
  if (!name) {
    problems.push(`${file}: the path must be entity.action/vN.schema.json`);
    continue;
  }
  const schema = JSON.parse(readFileSync(join(catalog, file), 'utf8')) as JsonSchema;
  problems.push(...checkEventSchema(name, schema).map((problem) => `${file}: ${problem}`));
  const { pascal } = identifiers(name);
  const typeSource = await compile({ ...schema, title: pascal }, pascal, {
    bannerComment: '',
    additionalProperties: false,
    format: false,
  });
  modules.push({
    module: name.replaceAll('.', '-'),
    source: renderEventModule(file, name, schema, typeSource),
  });
}

if (problems.length > 0) {
  console.error(`Event catalog errors:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}

// Formatted like the rest of the generated code (Orval also runs Prettier).
const write = async (file: string, source: string) => {
  const options = await resolveConfig(file);
  writeFileSync(file, await format(source, { ...options, filepath: file }));
};

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const { module, source } of modules) await write(join(output, `${module}.ts`), source);
await write(join(output, 'index.ts'), renderIndex(modules.map(({ module }) => module)));
console.log(`[events] generated: ${files.join(', ')}`);
