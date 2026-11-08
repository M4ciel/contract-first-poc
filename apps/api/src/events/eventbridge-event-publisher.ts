import { type EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { type DomainEvent, EventPublisher } from './event-publisher.js';

/** Every event the backend publishes has this source; consumers' rules match on it. */
export const EVENT_SOURCE = 'acme.library';

export class EventBridgeEventPublisher extends EventPublisher {
  constructor(
    private readonly client: EventBridgeClient,
    private readonly busName: string,
  ) {
    super();
  }

  override async publish(event: DomainEvent): Promise<void> {
    const result = await this.client.send(
      new PutEventsCommand({
        Entries: [
          {
            EventBusName: this.busName,
            Source: EVENT_SOURCE,
            DetailType: event.type,
            Time: event.occurredAt,
            Detail: JSON.stringify(event.data),
          },
        ],
      }),
    );
    // PutEvents reports per-entry failures in the body, not as an exception.
    if (result.FailedEntryCount) {
      const entry = result.Entries?.[0];
      throw new Error(
        `EventBridge rejected ${event.type}: ${entry?.ErrorCode} ${entry?.ErrorMessage}`,
      );
    }
  }
}
