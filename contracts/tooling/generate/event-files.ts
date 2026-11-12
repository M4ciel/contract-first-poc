import { readdirSync } from 'node:fs';

/**
 * Every JSON file of the event catalog, relative to it and with `/` separators
 * (`loan.created/v1.schema.json`). Files that do not follow the layout are returned too, so the
 * generator can reject them instead of silently skipping them.
 */
export const listEventFiles = (catalog: string): string[] =>
  readdirSync(catalog, { recursive: true, encoding: 'utf8' })
    .map((file) => file.replaceAll('\\', '/'))
    .filter((file) => file.endsWith('.json'))
    .sort();
