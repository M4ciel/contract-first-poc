/** Stock of one book. `availableCopies` in the API is `totalCopies - reservedCopies`. */
export interface StockRecord {
  readonly bookId: string;
  readonly totalCopies: number;
  readonly reservedCopies: number;
}

export interface ReservationRecord {
  readonly id: string;
  readonly bookId: string;
  readonly loanId: string;
  readonly status: 'active' | 'released';
  readonly createdAt: string;
}

export type ReserveOutcome =
  | { readonly status: 'reserved'; readonly reservation: ReservationRecord }
  | { readonly status: 'book-not-found' }
  | { readonly status: 'unavailable' };

/** Persistence port. DynamoDB in AWS (dynamo-inventory-store.ts), in memory in unit tests. */
export interface InventoryStore {
  getStock(bookId: string): Promise<StockRecord | undefined>;
  /** Reserves one copy atomically: it never reserves more copies than `totalCopies`. */
  reserve(reservation: Omit<ReservationRecord, 'status'>): Promise<ReserveOutcome>;
}
