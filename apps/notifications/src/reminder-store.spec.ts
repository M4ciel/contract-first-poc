import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { type DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoReminderStore } from './reminder-store.js';

const reminder = {
  id: 'event-1',
  kind: 'loan-due' as const,
  loanId: '0b9d8c7e-6f5a-4b3c-8d2e-1a0f9e8d7c6b',
  bookId: '7c1e4b52-3f0a-4d8e-9b6a-1f2e3d4c5b6a',
  remindAt: '2026-01-24T12:00:00.000Z',
};

const clientAnswering = (answer: () => Promise<unknown>) => {
  const sent: unknown[] = [];
  const client = {
    send: (command: unknown) => {
      sent.push(command);
      return answer();
    },
  } as unknown as DynamoDBDocumentClient;
  return { client, sent };
};

describe('DynamoReminderStore', () => {
  it('puts the reminder only if its id is new', async () => {
    const { client, sent } = clientAnswering(() => Promise.resolve({}));

    await expect(new DynamoReminderStore(client, 'reminders').add(reminder)).resolves.toBe(true);
    expect(sent[0]).toBeInstanceOf(PutCommand);
    expect((sent[0] as PutCommand).input).toEqual({
      TableName: 'reminders',
      Item: reminder,
      ConditionExpression: 'attribute_not_exists(id)',
    });
  });

  it('returns false for a reminder that already exists', async () => {
    const { client } = clientAnswering(() =>
      Promise.reject(new ConditionalCheckFailedException({ message: 'exists', $metadata: {} })),
    );

    await expect(new DynamoReminderStore(client, 'reminders').add(reminder)).resolves.toBe(false);
  });

  it('rethrows any other failure', async () => {
    const failure = new Error('throttled');
    const { client } = clientAnswering(() => Promise.reject(failure));

    await expect(new DynamoReminderStore(client, 'reminders').add(reminder)).rejects.toBe(failure);
  });
});
