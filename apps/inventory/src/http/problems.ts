import type { InvalidParam, ProblemDetails } from '@acme/inventory-client';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import type { z } from 'zod';

/** Where a value came from; it decides how `pointer` is written in validation errors. */
export type RequestLocation = 'body' | 'path';

const escapeSegment = (segment: PropertyKey): string =>
  String(segment).replaceAll('~', '~0').replaceAll('/', '~1');

/** JSON Pointer for the body (`/bookId`) and `#/path/<name>` for path parameters. */
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

const problem = (body: ProblemDetails): APIGatewayProxyStructuredResultV2 => ({
  statusCode: body.status,
  headers: { 'content-type': 'application/problem+json' },
  body: JSON.stringify(body),
});

/** Problem Details responses, with types from the shared catalog (`urn:acme:problem:*`). */
export const problems = {
  validation: (errors: InvalidParam[]) =>
    problem({
      type: 'urn:acme:problem:validation',
      title: 'Invalid request',
      status: 400,
      detail: 'The request does not match the contract.',
      errors,
    }),
  notFound: () =>
    problem({
      type: 'urn:acme:problem:not-found',
      title: 'Not found',
      status: 404,
      detail: 'No route matches the request.',
    }),
  bookNotFound: (bookId: string) =>
    problem({
      type: 'urn:acme:problem:book-not-found',
      title: 'Book not found',
      status: 404,
      detail: `No book has the id ${bookId}.`,
    }),
  bookUnavailable: (bookId: string) =>
    problem({
      type: 'urn:acme:problem:book-unavailable',
      title: 'Book unavailable',
      status: 409,
      detail: `Every copy of the book ${bookId} is reserved.`,
    }),
  internal: () =>
    problem({
      type: 'urn:acme:problem:internal',
      title: 'Internal server error',
      status: 500,
      detail: 'An unexpected error occurred.',
    }),
};
