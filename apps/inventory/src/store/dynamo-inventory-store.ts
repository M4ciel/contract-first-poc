import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import {
  type DynamoDBDocumentClient,
  GetCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import type {
  InventoryStore,
  ReservationRecord,
  ReserveOutcome,
  StockRecord,
} from './inventory-store.js';

export interface DynamoTables {
  /** Partition key `bookId`; attributes `totalCopies`, `reservedCopies`. */
  readonly stock: string;
  /** Partition key `id`. */
  readonly reservations: string;
}

export class DynamoInventoryStore implements InventoryStore {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tables: DynamoTables,
  ) {}

  async getStock(bookId: string): Promise<StockRecord | undefined> {
    const { Item } = await this.client.send(
      new GetCommand({ TableName: this.tables.stock, Key: { bookId }, ConsistentRead: true }),
    );
    return Item as StockRecord | undefined;
  }

  /**
   * One transaction increments `reservedCopies` only while it is below `totalCopies` and stores
   * the reservation, so two concurrent loans can never take the last copy twice.
   */
  async reserve(input: Omit<ReservationRecord, 'status'>): Promise<ReserveOutcome> {
    const reservation: ReservationRecord = { ...input, status: 'active' };
    try {
      await this.client.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Update: {
                TableName: this.tables.stock,
                Key: { bookId: input.bookId },
                UpdateExpression: 'SET reservedCopies = reservedCopies + :one',
                ConditionExpression: 'attribute_exists(bookId) AND reservedCopies < totalCopies',
                ExpressionAttributeValues: { ':one': 1 },
              },
            },
            {
              Put: {
                TableName: this.tables.reservations,
                Item: reservation,
                ConditionExpression: 'attribute_not_exists(id)',
              },
            },
          ],
        }),
      );
      return { status: 'reserved', reservation };
    } catch (error) {
      if (!(error instanceof TransactionCanceledException)) throw error;
      // The condition failed: tell "no such book" from "no free copy".
      const stock = await this.getStock(input.bookId);
      return stock ? { status: 'unavailable' } : { status: 'book-not-found' };
    }
  }
}
