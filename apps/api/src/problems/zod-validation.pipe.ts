import type { PipeTransform } from '@nestjs/common';
import type { InvalidParam } from '@acme/api-types';
import type { z } from 'zod';
import { problems } from './problem.exception.js';

/** Where a value came from; it decides how `pointer` is written in validation errors. */
export type RequestLocation = 'body' | 'query' | 'path';

const escapeSegment = (segment: PropertyKey): string =>
  String(segment).replaceAll('~', '~0').replaceAll('/', '~1');

/** JSON Pointer for the body (`/bookId`), `#/query/<name>` and `#/path/<name>` otherwise. */
const pointer = (location: RequestLocation, path: readonly PropertyKey[]): string => {
  const suffix = path.map((segment) => `/${escapeSegment(segment)}`).join('');
  return location === 'body' ? suffix : `#/${location}${suffix}`;
};

export const toInvalidParams = (error: z.ZodError, location: RequestLocation): InvalidParam[] =>
  error.issues.flatMap((issue) =>
    issue.code === 'unrecognized_keys'
      ? issue.keys.map((key) => ({
          pointer: pointer(location, [...issue.path, key]),
          detail: 'Unknown field: requests are strict.',
        }))
      : [{ pointer: pointer(location, issue.path), detail: issue.message }],
  );

/**
 * Validates a request part with a schema generated from the contract
 * (`@acme/api-types/validators`) and answers 400 `validation` with one entry per invalid field.
 */
export class ZodValidationPipe<Schema extends z.ZodType> implements PipeTransform {
  constructor(
    private readonly schema: Schema,
    private readonly location: RequestLocation,
  ) {}

  transform(value: unknown): z.output<Schema> {
    const result = this.schema.safeParse(value);
    if (!result.success) throw problems.validation(toInvalidParams(result.error, this.location));
    return result.data;
  }
}
