import { type DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { LoanRecord } from './loan.js';
import { LoanRepository } from './loan.repository.js';

/** Item shape in the loans table (partition key `id`). Dates are ISO 8601 strings. */
interface LoanItem {
  readonly id: string;
  readonly bookId: string;
  readonly startedAt: string;
  readonly dueAt: string;
  readonly returnedAt?: string;
}

export class DynamoLoanRepository extends LoanRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {
    super();
  }

  override async save(loan: LoanRecord): Promise<void> {
    const item: LoanItem = {
      id: loan.id,
      bookId: loan.bookId,
      startedAt: loan.startedAt.toISOString(),
      dueAt: loan.dueAt.toISOString(),
      ...(loan.returnedAt ? { returnedAt: loan.returnedAt.toISOString() } : {}),
    };
    await this.client.send(new PutCommand({ TableName: this.tableName, Item: item }));
  }

  override async findById(id: string): Promise<LoanRecord | undefined> {
    const { Item } = await this.client.send(
      new GetCommand({ TableName: this.tableName, Key: { id }, ConsistentRead: true }),
    );
    if (!Item) return undefined;
    const item = Item as LoanItem;
    return {
      id: item.id,
      bookId: item.bookId,
      startedAt: new Date(item.startedAt),
      dueAt: new Date(item.dueAt),
      ...(item.returnedAt ? { returnedAt: new Date(item.returnedAt) } : {}),
    };
  }
}
