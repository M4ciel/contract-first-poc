import { GetCommand, PutCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { fakeAwsClient, inputOf } from '@testing/fake-aws-client.js';
import { DynamoLoanRepository } from './dynamo-loan.repository.js';

const loan = {
  id: '0b9d8c7e-6f5a-4b3c-8d2e-1a0f9e8d7c6b',
  bookId: '7c1e4b52-3f0a-4d8e-9b6a-1f2e3d4c5b6a',
  startedAt: new Date('2026-01-10T12:00:00.000Z'),
  dueAt: new Date('2026-01-24T12:00:00.000Z'),
};
const item = {
  id: loan.id,
  bookId: loan.bookId,
  startedAt: '2026-01-10T12:00:00.000Z',
  dueAt: '2026-01-24T12:00:00.000Z',
};

describe('DynamoLoanRepository', () => {
  it('stores dates as ISO 8601 strings', async () => {
    const { client, sent } = fakeAwsClient<DynamoDBDocumentClient>([() => ({}), () => ({})]);
    const repository = new DynamoLoanRepository(client, 'loans');

    await repository.save(loan);
    await repository.save({ ...loan, returnedAt: new Date('2026-01-20T09:00:00.000Z') });

    expect(sent[0]).toBeInstanceOf(PutCommand);
    expect(inputOf(sent)).toEqual({ TableName: 'loans', Item: item });
    expect(inputOf(sent, 1)).toMatchObject({ Item: { returnedAt: '2026-01-20T09:00:00.000Z' } });
  });

  it('reads a loan back with a consistent read', async () => {
    const { client, sent } = fakeAwsClient<DynamoDBDocumentClient>([
      () => ({ Item: item }),
      () => ({ Item: { ...item, returnedAt: '2026-01-20T09:00:00.000Z' } }),
      () => ({}),
    ]);
    const repository = new DynamoLoanRepository(client, 'loans');

    await expect(repository.findById(loan.id)).resolves.toEqual(loan);
    await expect(repository.findById(loan.id)).resolves.toEqual({
      ...loan,
      returnedAt: new Date('2026-01-20T09:00:00.000Z'),
    });
    await expect(repository.findById('missing')).resolves.toBeUndefined();
    expect(sent[0]).toBeInstanceOf(GetCommand);
    expect(inputOf(sent)).toEqual({
      TableName: 'loans',
      Key: { id: loan.id },
      ConsistentRead: true,
    });
  });
});
