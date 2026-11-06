import { HttpException, HttpStatus } from '@nestjs/common';
import type { ProblemDetails } from '@acme/api-types';
import { ProblemException, problems } from './problem.exception.js';

/**
 * Body of an error response. Problems from the catalog cover every documented error; anything
 * else (a bug, an unsupported media type) uses the RFC 9457 default type `about:blank`, whose
 * meaning is just the HTTP status.
 */
export type ProblemBody =
  ProblemDetails | { type: 'about:blank'; title: string; status: number; detail?: string };

/** Maps any thrown value to a Problem Details body. */
export const toProblem = (error: unknown): ProblemBody => {
  if (error instanceof ProblemException) return error.problem;
  if (!(error instanceof HttpException)) {
    // A bug: the details stay in the logs, never in the response.
    return { type: 'about:blank', title: 'Internal server error', status: 500 };
  }

  const status = error.getStatus();
  switch (status) {
    // Raised by the framework before a handler runs, for example for a malformed JSON body.
    case HttpStatus.BAD_REQUEST:
      return problems.validation([{ pointer: '', detail: error.message }]).problem;
    // Nest's answer for a route that does not exist.
    case HttpStatus.NOT_FOUND:
      return problems.notFound().problem;
    default:
      return { type: 'about:blank', title: error.message, status };
  }
};
