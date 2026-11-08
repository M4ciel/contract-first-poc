import { AppConfigDataClient } from '@aws-sdk/client-appconfigdata';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { FactoryProvider } from '@nestjs/common';

// Injection tokens for the AWS SDK clients. The SDK reads region, credentials and, locally,
// AWS_ENDPOINT_URL (MiniStack) from the environment, so nothing AWS-specific is in AppConfig.
export const DYNAMODB = Symbol('DYNAMODB');
export const EVENTBRIDGE = Symbol('EVENTBRIDGE');
export const APPCONFIG_DATA = Symbol('APPCONFIG_DATA');

export const dynamoDbProvider: FactoryProvider<DynamoDBDocumentClient> = {
  provide: DYNAMODB,
  useFactory: () => DynamoDBDocumentClient.from(new DynamoDBClient({})),
};

export const eventBridgeProvider: FactoryProvider<EventBridgeClient> = {
  provide: EVENTBRIDGE,
  useFactory: () => new EventBridgeClient({}),
};

export const appConfigDataProvider: FactoryProvider<AppConfigDataClient> = {
  provide: APPCONFIG_DATA,
  useFactory: () => new AppConfigDataClient({}),
};
