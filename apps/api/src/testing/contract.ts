import type { z } from 'zod';

/**
 * Asserts that a response body matches a schema generated from the contract. The generated
 * response schemas are tolerant (unknown fields are dropped, unknown enum values become
 * `unknown`), so comparing the parsed value with the original catches anything the server sends
 * that the contract does not declare.
 */
export const expectToMatchContract = (schema: z.ZodType, body: unknown): void => {
  expect(schema.parse(body)).toEqual(body);
};
