import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { listEventFiles } from './event-files.ts';
import { checkEventSchema, eventNameFromFile } from './generate-events-core.ts';

/**
 * Every schema in contracts/events follows the catalog rules, and its own examples are valid
 * events: the documentation cannot drift from the schema. The zod schemas are built the same way
 * the generated @acme/events package builds them.
 */
const catalog = path.join(process.cwd(), 'events');
const files = listEventFiles(catalog);
const asyncapi = readFileSync(path.join(catalog, 'asyncapi.yaml'), 'utf8');

describe.each(files)('%s', (file) => {
  const schema = JSON.parse(readFileSync(path.join(catalog, file), 'utf8')) as Record<
    string,
    unknown
  > & { examples?: Array<Record<string, unknown>>; required?: string[] };
  const exact = z.fromJSONSchema(schema as z.core.JSONSchema.JSONSchema);
  const tolerant = z.fromJSONSchema({
    ...schema,
    additionalProperties: true,
  } as z.core.JSONSchema.JSONSchema);
  const example = schema.examples?.[0] ?? {};

  it('follows the catalog rules', () => {
    const name = eventNameFromFile(file);

    expect(name).toBeDefined();
    expect(checkEventSchema(name ?? '', schema)).toEqual([]);
  });

  it('is referenced by the AsyncAPI document, so its channels are described', () => {
    expect(asyncapi).toContain(`$ref: './${file}'`);
  });

  it('has examples, and every example is a valid event', () => {
    expect(schema.examples?.length).toBeGreaterThan(0);
    for (const candidate of schema.examples ?? []) {
      expect(exact.parse(candidate)).toEqual(candidate);
    }
  });

  it('is exact for producers and tolerant for consumers', () => {
    const withNewField = { ...example, addedLater: true };

    expect(exact.safeParse(withNewField).success).toBe(false);
    expect(tolerant.safeParse(withNewField).success).toBe(true);
  });

  it('rejects an event without a required field', () => {
    for (const field of schema.required ?? []) {
      const { [field]: _removed, ...incomplete } = example;
      expect(exact.safeParse(incomplete).success).toBe(false);
    }
  });
});
