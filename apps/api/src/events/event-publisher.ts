import { Injectable } from '@nestjs/common';

/**
 * A domain event as the application publishes it. Names, sources and payload shapes come from the
 * event catalog (contracts/events, generated as `@acme/events`).
 */
export interface DomainEvent<Data = unknown> {
  /** Producer, from the catalog's `x-source` (EventBridge `source`). */
  readonly source: string;
  readonly type: string;
  readonly occurredAt: Date;
  readonly data: Data;
}

/** Event publishing port: EventBridge in AWS, memory in tests and local development. */
export abstract class EventPublisher {
  abstract publish(event: DomainEvent): Promise<void>;
}

@Injectable()
export class InMemoryEventPublisher extends EventPublisher {
  readonly published: DomainEvent[] = [];

  override publish(event: DomainEvent): Promise<void> {
    this.published.push(event);
    return Promise.resolve();
  }
}
