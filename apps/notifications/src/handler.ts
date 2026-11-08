import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { SQSEvent } from 'aws-lambda';
import { processRecords } from './process-records.js';
import { DynamoReminderStore } from './reminder-store.js';

const tableName = process.env['REMINDERS_TABLE'];
if (!tableName) throw new Error('Missing environment variable REMINDERS_TABLE');

// Created once per Lambda container. The SDK reads the region and, locally, AWS_ENDPOINT_URL.
const store = new DynamoReminderStore(
  DynamoDBDocumentClient.from(new DynamoDBClient({})),
  tableName,
);

export const handler = (event: SQSEvent) => processRecords(event.Records, store, console);
