import { type DynamoDBDocumentClient, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { BookRecord } from './book.js';
import { BookRepository, byCatalogOrder } from './book.repository.js';

/** Item shape in the books table (partition key `id`). Dates are ISO 8601 strings. */
interface BookItem {
  readonly id: string;
  readonly title: string;
  readonly authors: string[];
  readonly publishedAt: string;
  readonly createdAt: string;
}

const toRecord = (item: BookItem): BookRecord => ({
  id: item.id,
  title: item.title,
  authors: item.authors,
  publishedAt: new Date(item.publishedAt),
  createdAt: new Date(item.createdAt),
});

/**
 * The catalog is small and read-mostly, so `findAll` scans and sorts in memory. A large catalog
 * would page with a sort-key index instead.
 */
export class DynamoBookRepository extends BookRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {
    super();
  }

  override async findAll(): Promise<readonly BookRecord[]> {
    const books: BookRecord[] = [];
    let startKey: Record<string, unknown> | undefined;
    do {
      const page = await this.client.send(
        new ScanCommand({ TableName: this.tableName, ExclusiveStartKey: startKey }),
      );
      books.push(...((page.Items ?? []) as BookItem[]).map(toRecord));
      startKey = page.LastEvaluatedKey;
    } while (startKey);
    return books.sort(byCatalogOrder);
  }

  override async findById(id: string): Promise<BookRecord | undefined> {
    const { Item } = await this.client.send(
      new GetCommand({ TableName: this.tableName, Key: { id } }),
    );
    return Item ? toRecord(Item as BookItem) : undefined;
  }
}
