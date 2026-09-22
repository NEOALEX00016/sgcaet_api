import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateIdentificadoresQrActivoDto } from './dto/create-identificadores-qr-activo.dto';
import { UpdateIdentificadoresQrActivoDto } from './dto/update-identificadores-qr-activo.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { IdentificadoresQrActivo } from './entities/identificadores-qr-activo.entity';
import { Activo } from '../activos/entities/activo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class IdentificadoresQrActivoService {
  constructor(
    @InjectRepository(IdentificadoresQrActivo)
    private readonly identificadoresRepository: Repository<IdentificadoresQrActivo>,
    @InjectRepository(Activo)
    private readonly activosRepository: Repository<Activo>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async create(
    createDto: CreateIdentificadoresQrActivoDto,
    user: AuthenticatedUser,
  ): Promise<IdentificadoresQrActivo> {
    await this.validarActor(user);
    await this.validarActivo(createDto.activoId, user.empresaId);
    const normalizedCode = this.normalizeCodigoQr(createDto.codigoQr);
    const activoQr = await this.identificadoresRepository.findOne({ where: { activoId: createDto.activoId, empresaId: user.empresaId, estaActivo: true } });
    if (activoQr) throw new BadRequestException('El equipo ya tiene un QR activo asociado. Desactiva el QR actual antes de asociar otro.');

    const existe = await this.identificadoresRepository.findOne({
      where: { codigoQr: normalizedCode, empresaId: user.empresaId },
    });
    if (existe) {
      throw new BadRequestException('El codigo QR ya existe');
    }

    const identificador = this.identificadoresRepository.create({
      ...createDto,
      codigoQr: normalizedCode,
      empresaId: user.empresaId,
      estaActivo: createDto.estaActivo ?? true,
    });
    const saved = await this.identificadoresRepository.save(identificador);

    await this.registrarBitacora(
      user,
      'IDENTIFICADORES_QR_ACTIVO_CREAR',
      'identificadores_qr_activo',
      saved.id,
      null,
      {
        activoId: saved.activoId,
        codigoQr: saved.codigoQr,
        estaActivo: saved.estaActivo,
      },
    );

    return saved;
  }

  async findAll(
    user: AuthenticatedUser,
    activoId?: string,
  ): Promise<IdentificadoresQrActivo[]> {
    const where: Partial<IdentificadoresQrActivo> = {
      empresaId: user.empresaId,
    };
    if (activoId) {
      where.activoId = activoId;
    }

    return this.identificadoresRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<IdentificadoresQrActivo> {
    const identificador = await this.identificadoresRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!identificador) {
      throw new NotFoundException(`Identificador QR ${id} no encontrado`);
    }

    return identificador;
  }

  async findByCodigoQr(
    codigoQr: string,
    user: AuthenticatedUser,
  ): Promise<IdentificadoresQrActivo> {
    const normalizedCode = this.normalizeCodigoQr(codigoQr);
    const identificador = await this.identificadoresRepository.findOne({
      where: { codigoQr: normalizedCode, empresaId: user.empresaId, estaActivo: true },
    });
    if (!identificador) {
      throw new NotFoundException(`Identificador QR ${normalizedCode} no encontrado`);
    }

    return identificador;
  }

  async update(
    id: string,
    updateDto: UpdateIdentificadoresQrActivoDto,
    user: AuthenticatedUser,
  ): Promise<IdentificadoresQrActivo> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    const activoId = updateDto.activoId ?? actual.activoId;
    await this.validarActivo(activoId, actual.empresaId);

    if (updateDto.codigoQr && updateDto.codigoQr !== actual.codigoQr) {
      const normalizedCode = this.normalizeCodigoQr(updateDto.codigoQr);
      const existe = await this.identificadoresRepository.findOne({
        where: { codigoQr: normalizedCode, empresaId: user.empresaId },
      });
      if (existe) {
        throw new BadRequestException('El codigo QR ya existe');
      }
      updateDto.codigoQr = normalizedCode;
    }

    const merged = this.identificadoresRepository.merge(actual, updateDto);
    const saved = await this.identificadoresRepository.save(merged);

    await this.registrarBitacora(
      user,
      'IDENTIFICADORES_QR_ACTIVO_ACTUALIZAR',
      'identificadores_qr_activo',
      saved.id,
      {
        codigoQr: actual.codigoQr,
        estaActivo: actual.estaActivo,
      },
      {
        codigoQr: saved.codigoQr,
        estaActivo: saved.estaActivo,
      },
    );

    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    actual.estaActivo = false;
    await this.identificadoresRepository.save(actual);

    await this.registrarBitacora(
      user,
      'IDENTIFICADORES_QR_ACTIVO_DESACTIVAR',
      'identificadores_qr_activo',
      actual.id,
      {
        estaActivo: true,
      },
      {
        estaActivo: actual.estaActivo,
      },
    );
  }

  private async validarActivo(
    activoId: string,
    empresaId: string,
  ): Promise<void> {
    const activo = await this.activosRepository.findOne({
      where: {
        id: activoId,
        empresaId,
        deletedAt: IsNull(),
      },
    });

    if (!activo) {
      throw new NotFoundException(
        'Activo no encontrado para la empresa indicada',
      );
    }
  }

  private async validarActor(user: AuthenticatedUser): Promise<void> {
    const actor = await this.usuariosRepository.findOne({
      where: {
        id: user.userId,
        empresaId: user.empresaId,
        deletedAt: IsNull(),
      },
    });

    if (!actor) {
      throw new NotFoundException(
        'Usuario actor no encontrado para la empresa indicada',
      );
    }
  }

  private async registrarBitacora(
    user: AuthenticatedUser,
    accion: string,
    entidad: string,
    entidadId: string,
    valoresAnteriores: Record<string, unknown> | null,
    valoresNuevos: Record<string, unknown> | null,
  ): Promise<void> {
    const registro = this.bitacoraRepository.create({
      empresaId: user.empresaId,
      usuarioActorId: user.userId,
      accion,
      entidad,
      entidadId,
      valoresAnteriores: valoresAnteriores ?? undefined,
      valoresNuevos: valoresNuevos ?? undefined,
      resultado: 'exito',
    });

    await this.bitacoraRepository.save(registro);
  }

  private normalizeCodigoQr(value: string) {
    const normalized = value.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('El codigo QR es obligatorio.');
    }
    return normalized;
  }
}
