import { HttpException, NotFoundException } from '@nestjs/common';
import { problems } from './problem.exception.js';
import { toProblem } from './to-problem.js';

describe('toProblem', () => {
  it('keeps problems from the catalog as they are', () => {
    const problem = problems.bookUnavailable('book-1');

    expect(toProblem(problem)).toBe(problem.problem);
  });

  it('maps a framework 400 to a validation problem on the whole request', () => {
    expect(toProblem(new HttpException('Body is not valid JSON', 400))).toEqual({
      type: 'urn:acme:problem:validation',
      title: 'Invalid request',
      status: 400,
      detail: 'The request has 1 invalid field.',
      errors: [{ pointer: '', detail: 'Body is not valid JSON' }],
    });
  });

  it('maps an unknown route to not-found', () => {
    expect(toProblem(new NotFoundException())).toMatchObject({
      type: 'urn:acme:problem:not-found',
    });
  });

  it('uses about:blank for other HTTP errors', () => {
    expect(toProblem(new HttpException('Unsupported Media Type', 415))).toEqual({
      type: 'about:blank',
      title: 'Unsupported Media Type',
      status: 415,
    });
  });

  it('hides the details of unexpected errors', () => {
    expect(toProblem(new Error('database password is wrong'))).toEqual({
      type: 'urn:acme:problem:internal',
      title: 'Internal server error',
      status: 500,
    });
  });
});
