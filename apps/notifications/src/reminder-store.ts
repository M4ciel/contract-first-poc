import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { type DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

/** A reminder to return a book, scheduled for its due date. No personal data. */
export interface Reminder {
  /** The id of the event that created it, so a redelivered event is stored once. */
  readonly id: string;
  readonly kind: 'loan-due';
  readonly loanId: string;
  readonly bookId: string;
  readonly remindAt: string;
}

export interface ReminderStore {
  /** Returns `false` when the reminder already exists (the event was delivered twice). */
  add(reminder: Reminder): Promise<boolean>;
}

export class DynamoReminderStore implements ReminderStore {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async add(reminder: Reminder): Promise<boolean> {
    try {
      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: reminder,
          ConditionExpression: 'attribute_not_exists(id)',
        }),
      );
      return true;
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) return false;
      throw error;
    }
  }
}
