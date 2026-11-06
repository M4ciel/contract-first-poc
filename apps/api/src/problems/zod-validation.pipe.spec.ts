import { z } from 'zod';
import { toInvalidParams, ZodValidationPipe } from './zod-validation.pipe.js';

describe('ZodValidationPipe', () => {
  const schema = z.strictObject({ nested: z.strictObject({ 'a/b~c': z.string() }) });

  it('returns the parsed value', () => {
    const value = { nested: { 'a/b~c': 'ok' } };

    expect(new ZodValidationPipe(schema, 'body').transform(value)).toEqual(value);
  });

  it('writes RFC 6901 pointers, escaping ~ and /', () => {
    const result = schema.safeParse({ nested: { 'a/b~c': 1, extra: true } });
    if (result.success) throw new Error('expected a failure');

    expect(toInvalidParams(result.error, 'body').map((error) => error.pointer)).toEqual([
      '/nested/a~1b~0c',
      '/nested/extra',
    ]);
    expect(toInvalidParams(result.error, 'query')[0]?.pointer).toBe('#/query/nested/a~1b~0c');
  });

  it('reports a problem for the whole value with an empty pointer', () => {
    expect(() => new ZodValidationPipe(schema, 'body').transform('text')).toThrow(
      expect.objectContaining({
        problem: expect.objectContaining({ errors: [expect.objectContaining({ pointer: '' })] }),
      }),
    );
  });
});
