import { randomUUID } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { route } from '@http/router.js';
import { DynamoInventoryStore } from '@store/dynamo-inventory-store.js';

const requiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
};

// Created once per Lambda container and reused by every invocation. The SDK reads the region and,
// locally, AWS_ENDPOINT_URL (MiniStack) from the environment.
const store = new DynamoInventoryStore(DynamoDBDocumentClient.from(new DynamoDBClient({})), {
  stock: requiredEnv('STOCK_TABLE'),
  reservations: requiredEnv('RESERVATIONS_TABLE'),
});

export const handler = (event: APIGatewayProxyEventV2) =>
  route(event, {
    store,
    newId: randomUUID,
    now: () => new Date(),
    logError: (error) => console.error(error),
  });
