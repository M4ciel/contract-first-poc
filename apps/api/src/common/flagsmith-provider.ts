import type { Flags } from '@flagsmith/nodejs';
import {
  FlagNotFoundError,
  type Provider,
  type ResolutionDetails,
  StandardResolutionReasons,
  TypeMismatchError,
} from '@openfeature/server-sdk';

/** The part of the Flagsmith SDK this provider uses, so tests can pass a fake. */
export interface FlagsmithClient {
  getEnvironmentFlags(): Promise<Pick<Flags, 'getFlag'>>;
  close(): Promise<void>;
}

/**
 * Minimal OpenFeature provider for Flagsmith. The official server provider still depends on the
 * deprecated `flagsmith-nodejs` package, so this one wraps the current `@flagsmith/nodejs` SDK.
 * Only boolean flags are used in this project; other types are reported as a type mismatch and
 * OpenFeature answers with the caller's default.
 *
 * The SDK runs in local-evaluation mode: it downloads the environment once, polls it in the
 * background and evaluates flags in memory, so a flag check never waits for the network.
 */
export class FlagsmithProvider implements Provider {
  readonly metadata = { name: 'flagsmith' } as const;
  readonly runsOn = 'server' as const;

  constructor(private readonly client: FlagsmithClient) {}

  /** Downloads the environment before the app starts serving; fails startup if Flagsmith is down. */
  async initialize(): Promise<void> {
    await this.client.getEnvironmentFlags();
  }

  onClose(): Promise<void> {
    return this.client.close();
  }

  async resolveBooleanEvaluation(flagKey: string): Promise<ResolutionDetails<boolean>> {
    const flag = (await this.client.getEnvironmentFlags()).getFlag(flagKey);
    if (flag.isDefault) throw new FlagNotFoundError(`Flag ${flagKey} does not exist in Flagsmith`);
    return { value: flag.enabled, reason: StandardResolutionReasons.STATIC };
  }

  resolveStringEvaluation(): Promise<ResolutionDetails<string>> {
    return Promise.reject(new TypeMismatchError('Only boolean flags are supported'));
  }

  resolveNumberEvaluation(): Promise<ResolutionDetails<number>> {
    return Promise.reject(new TypeMismatchError('Only boolean flags are supported'));
  }

  resolveObjectEvaluation<T>(): Promise<ResolutionDetails<T>> {
    return Promise.reject(new TypeMismatchError('Only boolean flags are supported'));
  }
}
