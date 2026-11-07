import { ProblemDetails, type ProblemDetailsOutput } from '@acme/api-types';
import type { z } from 'zod';

/**
 * The generated fetch client resolves every status (it does not throw on 4xx/5xx) and does not
 * validate. This module turns its `{ status, data }` into a typed result, parsing the body with the
 * generated **tolerant** schemas: unknown fields are dropped and unknown enum values become
 * `'unknown'`, so a newer backend cannot break this app. A body that really breaks the contract
 * still throws, and TanStack Query reports it as an error.
 */
export type ApiResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly problem: ProblemDetailsOutput };

export interface RawResponse {
  readonly status: number;
  readonly data: unknown;
}

/** Used when an error body is not Problem Details (for example a proxy's HTML error page). */
export const unexpectedProblem = (status: number): ProblemDetailsOutput => ({
  type: 'unknown',
  title: 'Unexpected response from the server',
  status,
});

export const toApiResult = <S extends z.ZodType>(
  schema: S,
  successStatus: number,
  response: RawResponse,
): ApiResult<z.output<S>> => {
  if (response.status === successStatus) {
    return { ok: true, value: schema.parse(response.data) };
  }
  const problem = ProblemDetails.safeParse(response.data);
  return {
    ok: false,
    problem: problem.success ? problem.data : unexpectedProblem(response.status),
  };
};
