import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Health, NotFoundResponse } from '@acme/api-types';
import { expectToMatchContract } from '#src/testing/contract.js';
import { createTestApp } from '#src/testing/test-app.js';

describe('health and unknown routes', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(() => app.close());

  it('GET /v1/health answers ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    expectToMatchContract(Health, response.json());
  });

  it('answers 404 not-found for a route that does not exist', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/nothing-here' });

    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(response.json()).toMatchObject({ type: 'urn:acme:problem:not-found', status: 404 });
    expectToMatchContract(NotFoundResponse, response.json());
  });
});
