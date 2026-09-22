import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { OutboxEventosIntegracionService } from './outbox-eventos-integracion.service';

@Controller('outbox-eventos-integracion')
@RequirePermission('integraciones.gestionar')
export class OutboxEventosIntegracionController {
  constructor(
    private readonly outboxEventosIntegracionService: OutboxEventosIntegracionService,
  ) {}

  @Get('dead-letter')
  findDeadLetter(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
  ) {
    const parsed = Number(limit);
    const safeLimit = Number.isFinite(parsed) ? parsed : 100;
    return this.outboxEventosIntegracionService.findDeadLetter(
      user.empresaId,
      safeLimit,
    );
  }

  @Get('metrics')
  metrics(@CurrentUser() user: AuthenticatedUser) {
    return this.outboxEventosIntegracionService.getMetrics(user.empresaId);
  }

  @Post(':id/retry')
  retryDeadLetter(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.outboxEventosIntegracionService.retryDeadLetter(id, user);
  }
}
