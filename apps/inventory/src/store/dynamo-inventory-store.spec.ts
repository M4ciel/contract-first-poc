import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import {
  type DynamoDBDocumentClient,
  GetCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoInventoryStore } from './dynamo-inventory-store.js';

const BOOK_ID = '7c1e4b52-3f0a-4d8e-9b6a-1f2e3d4c5b6a';
const tables = { stock: 'stock-table', reservations: 'reservations-table' };
const reservation = {
  id: '5e4d3c2b-1a09-4f8e-8d7c-6b5a4f3e2d1c',
  bookId: BOOK_ID,
  loanId: '0b9d8c7e-6f5a-4b3c-8d2e-1a0f9e8d7c6b',
  createdAt: '2026-03-01T10:00:00.000Z',
};

/** A document client that records each command and answers from a script, one entry per call. */
const fakeClient = (answers: Array<(command: unknown) => unknown>) => {
  const sent: unknown[] = [];
  const client = {
    send: (command: unknown) => {
      sent.push(command);
      const answer = answers.shift();
      if (!answer) throw new Error('Unexpected command');
      return Promise.resolve().then(() => answer(command));
    },
  } as unknown as DynamoDBDocumentClient;
  return { client, sent };
};

const cancelled = () =>
  new TransactionCanceledException({ message: 'Transaction cancelled', $metadata: {} });

describe('DynamoInventoryStore', () => {
  it('reads the stock with a consistent read', async () => {
    const stock = { bookId: BOOK_ID, totalCopies: 3, reservedCopies: 1 };
    const { client, sent } = fakeClient([() => ({ Item: stock })]);

    await expect(new DynamoInventoryStore(client, tables).getStock(BOOK_ID)).resolves.toEqual(
      stock,
    );
    expect(sent[0]).toBeInstanceOf(GetCommand);
    expect((sent[0] as GetCommand).input).toEqual({
      TableName: 'stock-table',
      Key: { bookId: BOOK_ID },
      ConsistentRead: true,
    });
  });

  it('reserves with one conditional transaction', async () => {
    const { client, sent } = fakeClient([() => ({})]);

    await expect(new DynamoInventoryStore(client, tables).reserve(reservation)).resolves.toEqual({
      status: 'reserved',
      reservation: { ...reservation, status: 'active' },
    });
    expect(sent[0]).toBeInstanceOf(TransactWriteCommand);
    const [update, put] = (sent[0] as TransactWriteCommand).input.TransactItems ?? [];
    expect(update?.Update).toMatchObject({
      TableName: 'stock-table',
      Key: { bookId: BOOK_ID },
      ConditionExpression: 'attribute_exists(bookId) AND reservedCopies < totalCopies',
    });
    expect(put?.Put).toMatchObject({
      TableName: 'reservations-table',
      Item: { ...reservation, status: 'active' },
    });
  });

  it('reports unavailable when the condition fails for a book that exists', async () => {
    const { client } = fakeClient([
      () => Promise.reject(cancelled()),
      () => ({ Item: { bookId: BOOK_ID, totalCopies: 1, reservedCopies: 1 } }),
    ]);

    await expect(new DynamoInventoryStore(client, tables).reserve(reservation)).resolves.toEqual({
      status: 'unavailable',
    });
  });

  it('reports book-not-found when the condition fails because the book does not exist', async () => {
    const { client } = fakeClient([() => Promise.reject(cancelled()), () => ({})]);

    await expect(new DynamoInventoryStore(client, tables).reserve(reservation)).resolves.toEqual({
      status: 'book-not-found',
    });
  });

  it('rethrows any other failure', async () => {
    const failure = new Error('throttled');
    const { client } = fakeClient([() => Promise.reject(failure)]);

    await expect(new DynamoInventoryStore(client, tables).reserve(reservation)).rejects.toBe(
      failure,
    );
  });
});
