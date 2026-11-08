import type { APIGatewayProxyEventV2 } from 'aws-lambda';

describe('handler', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it('fails fast at cold start when a table name is missing', async () => {
    delete process.env['STOCK_TABLE'];

    await expect(import(`./handler.js?missing=${Date.now()}`)).rejects.toThrow(
      'Missing environment variable STOCK_TABLE',
    );
  });

  it('routes requests (a route outside the contract never reaches DynamoDB)', async () => {
    process.env['STOCK_TABLE'] = 'stock-table';
    process.env['RESERVATIONS_TABLE'] = 'reservations-table';
    process.env['AWS_REGION'] = 'us-east-1';
    const { handler } = (await import(
      `./handler.js?ok=${Date.now()}`
    )) as typeof import('./handler.js');

    const result = await handler({ routeKey: 'GET /v1/other' } as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(404);
  });
});
