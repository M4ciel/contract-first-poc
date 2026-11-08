import { GetCommand, ScanCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { fakeAwsClient, inputOf } from '@testing/fake-aws-client.js';
import { DynamoBookRepository } from './dynamo-book.repository.js';

const item = (id: string, createdAt: string) => ({
  id,
  title: `Title ${id}`,
  authors: ['Author name 1'],
  publishedAt: '2001-01-15T00:00:00.000Z',
  createdAt,
});

describe('DynamoBookRepository', () => {
  it('scans every page and returns the books in catalog order', async () => {
    const { client, sent } = fakeAwsClient<DynamoDBDocumentClient>([
      () => ({
        Items: [item('b', '2026-01-10T12:01:00.000Z')],
        LastEvaluatedKey: { id: 'b' },
      }),
      () => ({
        Items: [item('a', '2026-01-10T12:00:00.000Z'), item('c', '2026-01-10T12:01:00.000Z')],
      }),
    ]);

    const books = await new DynamoBookRepository(client, 'books').findAll();

    expect(books.map((book) => book.id)).toEqual(['a', 'b', 'c']);
    expect(books[0]?.createdAt).toEqual(new Date('2026-01-10T12:00:00.000Z'));
    expect(sent).toHaveLength(2);
    expect(sent[0]).toBeInstanceOf(ScanCommand);
    expect(inputOf(sent, 1)).toMatchObject({ TableName: 'books', ExclusiveStartKey: { id: 'b' } });
  });

  it('copes with an empty page', async () => {
    const { client } = fakeAwsClient<DynamoDBDocumentClient>([() => ({})]);

    await expect(new DynamoBookRepository(client, 'books').findAll()).resolves.toEqual([]);
  });

  it('finds a book by id', async () => {
    const { client, sent } = fakeAwsClient<DynamoDBDocumentClient>([
      () => ({ Item: item('a', '2026-01-10T12:00:00.000Z') }),
      () => ({}),
    ]);
    const repository = new DynamoBookRepository(client, 'books');

    await expect(repository.findById('a')).resolves.toMatchObject({ id: 'a', title: 'Title a' });
    await expect(repository.findById('missing')).resolves.toBeUndefined();
    expect(sent[0]).toBeInstanceOf(GetCommand);
    expect(inputOf(sent)).toEqual({ TableName: 'books', Key: { id: 'a' } });
  });
});
