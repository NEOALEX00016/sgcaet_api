import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePlanesTelefonicoDto } from './dto/create-planes-telefonico.dto';
import { UpdatePlanesTelefonicoDto } from './dto/update-planes-telefonico.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PlanesTelefonico } from './entities/planes-telefonico.entity';
import { Operadora } from '../operadoras/entities/operadora.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class PlanesTelefonicosService {
  constructor(
    @InjectRepository(PlanesTelefonico)
    private readonly planesRepository: Repository<PlanesTelefonico>,
    @InjectRepository(Operadora)
    private readonly operadorasRepository: Repository<Operadora>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async create(
    createPlanesTelefonicoDto: CreatePlanesTelefonicoDto,
    user: AuthenticatedUser,
  ): Promise<PlanesTelefonico> {
    await this.validarActor(user);
    await this.validarOperadora(
      createPlanesTelefonicoDto.operadoraId,
      user.empresaId,
    );
    this.validarCostoMensual(createPlanesTelefonicoDto.costoMensual);

    const plan = this.planesRepository.create({
      ...createPlanesTelefonicoDto,
      empresaId: user.empresaId,
      moneda: createPlanesTelefonicoDto.moneda?.toUpperCase() ?? 'DOP',
      estaActivo: createPlanesTelefonicoDto.estaActivo ?? true,
      incluyeDatos: createPlanesTelefonicoDto.incluyeDatos ?? false,
      incluyeMinutos: createPlanesTelefonicoDto.incluyeMinutos ?? false,
      incluyeSms: createPlanesTelefonicoDto.incluyeSms ?? false,
    });
    const saved = await this.planesRepository.save(plan);

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'PLANES_TELEFONICOS_CREAR',
      'planes_telefonicos',
      saved.id,
      null,
      {
        codigo: saved.codigo,
        nombre: saved.nombre,
        operadoraId: saved.operadoraId,
      },
    );

    return saved;
  }

  async findAll(
    user: AuthenticatedUser,
    operadoraId?: string,
  ): Promise<PlanesTelefonico[]> {
    const where: Partial<PlanesTelefonico> = { empresaId: user.empresaId };
    if (operadoraId) {
      where.operadoraId = operadoraId;
    }

    return this.planesRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<PlanesTelefonico> {
    const plan = await this.planesRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!plan) {
      throw new NotFoundException(`Plan telefonico ${id} no encontrado`);
    }

    return plan;
  }

  async update(
    id: string,
    updatePlanesTelefonicoDto: UpdatePlanesTelefonicoDto,
    user: AuthenticatedUser,
  ): Promise<PlanesTelefonico> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    const operadoraId =
      updatePlanesTelefonicoDto.operadoraId ?? actual.operadoraId;
    await this.validarOperadora(operadoraId, actual.empresaId);
    this.validarCostoMensual(updatePlanesTelefonicoDto.costoMensual);

    const payload = updatePlanesTelefonicoDto;
    const merged = this.planesRepository.merge(actual, {
      ...payload,
      moneda: payload.moneda ? payload.moneda.toUpperCase() : actual.moneda,
    });
    const saved = await this.planesRepository.save(merged);

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'PLANES_TELEFONICOS_ACTUALIZAR',
      'planes_telefonicos',
      saved.id,
      {
        nombre: actual.nombre,
        costoMensual: actual.costoMensual ?? null,
        estaActivo: actual.estaActivo,
      },
      {
        nombre: saved.nombre,
        costoMensual: saved.costoMensual ?? null,
        estaActivo: saved.estaActivo,
      },
    );

    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    actual.estaActivo = false;
    await this.planesRepository.save(actual);

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'PLANES_TELEFONICOS_DESACTIVAR',
      'planes_telefonicos',
      actual.id,
      {
        estaActivo: true,
      },
      {
        estaActivo: actual.estaActivo,
      },
    );
  }

  private async validarOperadora(
    operadoraId: string,
    empresaId: string,
  ): Promise<void> {
    const operadora = await this.operadorasRepository.findOne({
      where: {
        id: operadoraId,
        empresaId,
      },
    });

    if (!operadora || !operadora.estaActiva) {
      throw new NotFoundException(
        'Operadora no encontrada para la empresa indicada',
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

  private validarCostoMensual(costoMensual?: string): void {
    if (costoMensual === undefined || costoMensual === null) {
      return;
    }

    if (Number(costoMensual) < 0) {
      throw new BadRequestException(
        'El costo mensual no puede ser negativo',
      );
    }
  }

  private async registrarBitacora(
    usuarioActorId: string,
    empresaId: string,
    accion: string,
    entidad: string,
    entidadId: string,
    valoresAnteriores: Record<string, unknown> | null,
    valoresNuevos: Record<string, unknown> | null,
  ): Promise<void> {
    const registro = this.bitacoraRepository.create({
      empresaId,
      usuarioActorId,
      accion,
      entidad,
      entidadId,
      valoresAnteriores: valoresAnteriores ?? undefined,
      valoresNuevos: valoresNuevos ?? undefined,
      resultado: 'exito',
    });

    await this.bitacoraRepository.save(registro);
  }
}
