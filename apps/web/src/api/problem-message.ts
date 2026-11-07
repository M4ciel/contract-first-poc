import type { ProblemDetailsOutput } from '@acme/api-types';

export interface ProblemMessage {
  readonly title: string;
  readonly detail: string | undefined;
  readonly fields: readonly string[];
}

/**
 * Branches on the problem `type` for the cases the UI words itself, and falls back to the
 * server's `title`/`detail` for everything else, including types this build does not know yet
 * (`'unknown'`).
 */
export const toProblemMessage = (problem: ProblemDetailsOutput): ProblemMessage => {
  const fields = (problem.errors ?? []).map(
    (error) => `${error.pointer || '(body)'}: ${error.detail}`,
  );
  switch (problem.type) {
    case 'urn:acme:problem:book-unavailable':
      return { title: 'No copy available', detail: 'Every copy of this book is on loan.', fields };
    case 'urn:acme:problem:service-unavailable':
      return { title: 'Try again in a moment', detail: problem.detail, fields };
    default:
      return { title: problem.title, detail: problem.detail, fields };
  }
};
