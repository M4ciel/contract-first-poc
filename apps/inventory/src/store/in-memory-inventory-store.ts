import type {
  InventoryStore,
  ReservationRecord,
  ReserveOutcome,
  StockRecord,
} from './inventory-store.js';

export class InMemoryInventoryStore implements InventoryStore {
  private readonly stock = new Map<string, StockRecord>();
  readonly reservations: ReservationRecord[] = [];

  constructor(stock: readonly StockRecord[] = []) {
    for (const record of stock) this.stock.set(record.bookId, record);
  }

  getStock(bookId: string): Promise<StockRecord | undefined> {
    return Promise.resolve(this.stock.get(bookId));
  }

  reserve(input: Omit<ReservationRecord, 'status'>): Promise<ReserveOutcome> {
    const record = this.stock.get(input.bookId);
    if (!record) return Promise.resolve({ status: 'book-not-found' });
    if (record.reservedCopies >= record.totalCopies)
      return Promise.resolve({ status: 'unavailable' });
    this.stock.set(input.bookId, { ...record, reservedCopies: record.reservedCopies + 1 });
    const reservation: ReservationRecord = { ...input, status: 'active' };
    this.reservations.push(reservation);
    return Promise.resolve({ status: 'reserved', reservation });
  }
}
