import { Inject, Injectable, Logger } from '@nestjs/common';
import { configureInventoryClient, createReservation, Reservation } from '@acme/inventory-client';
import { APP_CONFIG, type AppConfig } from '@config/app-config.js';
import { problems } from '@problems/problem.exception.js';

export type ReservationOutcome = 'reserved' | 'book-not-found' | 'unavailable';

/**
 * Talks to the inventory service through the client generated from its own contract. Its
 * responses are parsed with the generated (tolerant) schemas, so a new field or enum value on the
 * inventory side does not break the backend. A network failure, a timeout or an unexpected status
 * becomes 503 `service-unavailable`.
 */
@Injectable()
export class InventoryGateway {
  private readonly logger = new Logger(InventoryGateway.name);
  private readonly timeoutMs: number;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    configureInventoryClient({ baseUrl: config.inventoryBaseUrl });
    this.timeoutMs = config.inventoryTimeoutMs;
  }

  async reserve(bookId: string, loanId: string): Promise<ReservationOutcome> {
    let response: Awaited<ReturnType<typeof createReservation>>;
    try {
      response = await createReservation(
        { bookId, loanId },
        { signal: AbortSignal.timeout(this.timeoutMs) },
      );
    } catch (error) {
      this.logger.warn(`Inventory unreachable: ${String(error)}`);
      throw problems.serviceUnavailable('The inventory service could not be reached.');
    }

    switch (response.status) {
      case 201:
        if (!Reservation.safeParse(response.data).success) break;
        return 'reserved';
      case 404:
        return 'book-not-found';
      case 409:
        return 'unavailable';
    }
    this.logger.warn(`Unexpected inventory response: ${response.status}`);
    throw problems.serviceUnavailable('The inventory service returned an unexpected response.');
  }
}
