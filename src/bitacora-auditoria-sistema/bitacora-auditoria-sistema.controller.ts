import { Controller, Get, Param, Query } from '@nestjs/common';
import { BitacoraAuditoriaSistemaService } from './bitacora-auditoria-sistema.service';
import { QueryBitacoraAuditoriaSistemaDto } from './dto/query-bitacora-auditoria-sistema.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { TargetTenantContextService } from '../auth/target-tenant-context.service';
import { TargetEmpresaId } from '../auth/decorators/target-empresa-id.decorator';

@Controller('bitacora-auditoria-sistema')
@RequirePermission('auditoria.consultar')
export class BitacoraAuditoriaSistemaController {
  constructor(
    private readonly bitacoraAuditoriaSistemaService: BitacoraAuditoriaSistemaService,
    private readonly targetTenantContextService: TargetTenantContextService,
  ) {}

  @Get()
  findAll(
    @Query() query: QueryBitacoraAuditoriaSistemaDto,
    @CurrentUser() user: AuthenticatedUser,
    @TargetEmpresaId() targetEmpresaIdHeader?: string,
  ) {
    return this.targetTenantContextService
      .resolveTargetEmpresaId(
        user,
        targetEmpresaIdHeader,
        'PLATAFORMA_AUDITORIA_GLOBAL_CONSULTAR',
      )
      .then((targetEmpresaId) =>
        this.bitacoraAuditoriaSistemaService.findAll(query, user, targetEmpresaId),
      );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @TargetEmpresaId() targetEmpresaIdHeader?: string,
  ) {
    return this.targetTenantContextService
      .resolveTargetEmpresaId(
        user,
        targetEmpresaIdHeader,
        'PLATAFORMA_AUDITORIA_GLOBAL_CONSULTAR',
      )
      .then((targetEmpresaId) =>
        this.bitacoraAuditoriaSistemaService.findOne(id, user, targetEmpresaId),
      );
  }
}
