describe('handler', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it('fails fast at cold start without the table name', async () => {
    delete process.env['REMINDERS_TABLE'];

    await expect(import(`./handler.js?missing=${Date.now()}`)).rejects.toThrow(
      'Missing environment variable REMINDERS_TABLE',
    );
  });

  it('processes a batch (an empty one never reaches DynamoDB)', async () => {
    process.env['REMINDERS_TABLE'] = 'reminders';
    process.env['AWS_REGION'] = 'us-east-1';
    const { handler } = (await import(
      `./handler.js?ok=${Date.now()}`
    )) as typeof import('./handler.js');

    await expect(handler({ Records: [] })).resolves.toEqual({ batchItemFailures: [] });
  });
});
