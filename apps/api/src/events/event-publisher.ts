import { Injectable } from '@nestjs/common';

/**
 * A domain event as the application publishes it. `type` follows `entity.action.vN`; events are
 * immutable, so a new shape means a new version. `data` never carries personal data.
 */
export interface DomainEvent<Data = unknown> {
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
