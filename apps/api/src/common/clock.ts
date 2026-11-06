import { Injectable } from '@nestjs/common';

/** Source of the current time, injected so tests can control it. */
export abstract class Clock {
  abstract now(): Date;
}

@Injectable()
export class SystemClock extends Clock {
  override now(): Date {
    return new Date();
  }
}
