/**
 * A stand-in for an AWS SDK client: it records every command and answers from a script, one entry
 * per call. Adapter tests check the commands they build without any network.
 */
export const fakeAwsClient = <Client>(answers: Array<(command: unknown) => unknown>) => {
  const sent: unknown[] = [];
  const client = {
    send: (command: unknown) => {
      sent.push(command);
      const answer = answers.shift();
      if (!answer) return Promise.reject(new Error('Unexpected command'));
      return Promise.resolve().then(() => answer(command));
    },
  } as unknown as Client;
  return { client, sent };
};

/** The `input` of the n-th command sent. */
export const inputOf = (sent: unknown[], index = 0): unknown =>
  (sent[index] as { input: unknown }).input;
