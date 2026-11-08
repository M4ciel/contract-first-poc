import { type EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { fakeAwsClient, inputOf } from '@testing/fake-aws-client.js';
import { EventBridgeEventPublisher } from './eventbridge-event-publisher.js';

const event = {
  type: 'loan.created.v1',
  occurredAt: new Date('2026-01-10T12:00:00.000Z'),
  data: { loanId: 'l1' },
};

describe('EventBridgeEventPublisher', () => {
  it('puts the event on the bus with the event type as detail-type', async () => {
    const { client, sent } = fakeAwsClient<EventBridgeClient>([() => ({ FailedEntryCount: 0 })]);

    await new EventBridgeEventPublisher(client, 'acme-library').publish(event);

    expect(sent[0]).toBeInstanceOf(PutEventsCommand);
    expect(inputOf(sent)).toEqual({
      Entries: [
        {
          EventBusName: 'acme-library',
          Source: 'acme.library',
          DetailType: 'loan.created.v1',
          Time: event.occurredAt,
          Detail: '{"loanId":"l1"}',
        },
      ],
    });
  });

  it('throws when EventBridge rejects the entry', async () => {
    const { client } = fakeAwsClient<EventBridgeClient>([
      () => ({
        FailedEntryCount: 1,
        Entries: [{ ErrorCode: 'InternalFailure', ErrorMessage: 'try again' }],
      }),
    ]);

    await expect(new EventBridgeEventPublisher(client, 'bus').publish(event)).rejects.toThrow(
      'EventBridge rejected loan.created.v1: InternalFailure try again',
    );
  });
});
