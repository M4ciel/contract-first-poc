import { type ArgumentsHost, Catch, type ExceptionFilter, Logger } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { toProblem } from './to-problem.js';

export const PROBLEM_CONTENT_TYPE = 'application/problem+json';

/** Every error leaves the API as `application/problem+json`. */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const problem = toProblem(error);
    if (problem.status >= 500) this.logger.error(error);
    host
      .switchToHttp()
      .getResponse<FastifyReply>()
      .status(problem.status)
      .header('content-type', PROBLEM_CONTENT_TYPE)
      .send(problem);
  }
}
