import { Controller, Get } from '@nestjs/common';
import type { Health } from '@acme/api-types';

@Controller('v1/health')
export class HealthController {
  @Get()
  getHealth(): Health {
    return { status: 'ok' };
  }
}
