import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from '../auth/decorators/public.decorator';

@Controller()
export class HealthController {
  private readonly startedAt = new Date();

  constructor(private readonly dataSource: DataSource) {}

  @Public()
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'sgcaet-backend',
      version: process.env.APP_VERSION ?? '1.0.0',
      uptimeSeconds: Math.floor(process.uptime()),
      startedAt: this.startedAt.toISOString(),
    };
  }

  @Public()
  @Get('ready')
  async readiness() {
    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'ready',
        database: 'up',
        schema:
          (this.dataSource.options as { schema?: string }).schema ?? 'public',
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        database: 'down',
      });
    }
  }
}
