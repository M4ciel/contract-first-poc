import {
  applyDecorators,
  type CanActivate,
  type ExecutionContext,
  Injectable,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { problems } from '#src/problems/problem.exception.js';
import { type FeatureFlag, FeatureFlags } from './feature-flags.js';

const FEATURE_FLAG = 'acme:feature-flag';

/**
 * Hides a route behind a flag. Guards run before pipes, so a disabled route answers 404
 * `not-found` even for an invalid request, exactly as if it did not exist.
 */
@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly flags: FeatureFlags,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const flag = this.reflector.get<FeatureFlag>(FEATURE_FLAG, context.getHandler());
    if (!this.flags.isEnabled(flag)) throw problems.notFound();
    return true;
  }
}

export const RequireFeature = (flag: FeatureFlag): MethodDecorator =>
  applyDecorators(SetMetadata(FEATURE_FLAG, flag), UseGuards(FeatureFlagGuard));
