/**
 * Runner for the tolerant-response post-processing. Runs after Orval (see `contracts:generate`)
 * and rewrites the generated `*.zod.ts` response schemas in place. The logic lives in
 * `apply-response-enum-fallback-core.ts`; this file only reads and writes files.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  applyResponseFallback,
  collectResponseTypeNames,
} from './apply-response-enum-fallback-core.ts';

const root = join(import.meta.dirname, '..', '..');

const targets = [
  {
    api: 'library',
    client: 'packages/api-client/src/generated/client.ts',
    schemas: 'packages/api-types/src/generated',
  },
  {
    api: 'inventory',
    client: 'packages/inventory-client/src/generated/client.ts',
    schemas: 'packages/inventory-client/src/generated/schemas',
  },
] as const;

for (const target of targets) {
  const responseNames = collectResponseTypeNames(readFileSync(join(root, target.client), 'utf8'));
  const schemasDir = join(root, target.schemas);
  const found = new Set<string>();
  const rewritten = new Set<string>();

  for (const file of readdirSync(schemasDir).filter((name) => name.endsWith('.zod.ts'))) {
    const path = join(schemasDir, file);
    const { source, matched, changed } = applyResponseFallback(
      readFileSync(path, 'utf8'),
      responseNames,
      file,
    );
    if (changed.length > 0) writeFileSync(path, source);
    matched.forEach((name) => found.add(name));
    changed.forEach((name) => rewritten.add(name));
  }

  // Every response type must map to a schema the script could see. If not, Orval's output shape
  // changed and responses would silently stay strict, so fail the generation instead.
  const missing = [...responseNames].filter((name) => !found.has(name));
  if (missing.length > 0) {
    throw new Error(
      `[${target.api}] response schemas not found in ${relative(root, schemasDir)}: ${missing.join(', ')}`,
    );
  }
  console.log(`[${target.api}] tolerant responses: ${[...rewritten].sort().join(', ')}`);
}
