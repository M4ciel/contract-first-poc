import { toProblemMessage } from './problem-message.ts';

describe('toProblemMessage', () => {
  it('words the problem types the UI knows', () => {
    expect(
      toProblemMessage({
        type: 'urn:acme:problem:book-unavailable',
        title: 'Conflict',
        status: 409,
      }),
    ).toEqual({
      title: 'No copy available',
      detail: 'Every copy of this book is on loan.',
      fields: [],
    });
    expect(
      toProblemMessage({
        type: 'urn:acme:problem:service-unavailable',
        title: 'Service unavailable',
        status: 503,
        detail: 'The inventory service did not answer.',
      }),
    ).toEqual({
      title: 'Try again in a moment',
      detail: 'The inventory service did not answer.',
      fields: [],
    });
  });

  it('falls back to the server title and detail for other and unknown types', () => {
    expect(
      toProblemMessage({
        type: 'unknown',
        title: 'Slow down',
        status: 429,
        detail: 'Wait a minute.',
      }),
    ).toEqual({ title: 'Slow down', detail: 'Wait a minute.', fields: [] });
  });

  it('lists the invalid fields of a validation problem', () => {
    expect(
      toProblemMessage({
        type: 'urn:acme:problem:validation',
        title: 'Invalid request',
        status: 400,
        errors: [
          { pointer: '/bookId', detail: 'Invalid UUID' },
          { pointer: '', detail: 'Malformed JSON' },
        ],
      }).fields,
    ).toEqual(['/bookId: Invalid UUID', '(body): Malformed JSON']);
  });
});
