import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateActivoDto } from './dto/create-activo.dto';
import { UpdateActivoDto } from './dto/update-activo.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Activo } from './entities/activo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';

@Injectable()
export class ActivosService {
  constructor(
    @InjectRepository(Activo)
    private readonly activosRepository: Repository<Activo>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
    @InjectRepository(AsignacionRecurso)
    private readonly asignacionRecursosRepository: Repository<AsignacionRecurso>,
  ) {}

  async create(
    createActivoDto: CreateActivoDto,
    user: AuthenticatedUser,
  ): Promise<Activo> {
    await this.validarActor(user);

    const activo = this.activosRepository.create({
      ...createActivoDto,
      empresaId: user.empresaId,
      estado: createActivoDto.estado ?? 'registrado',
      estaActivo: createActivoDto.estaActivo ?? true,
      moneda: createActivoDto.moneda?.toUpperCase(),
    });

    const saved = await this.activosRepository.save(activo);

    await this.registrarBitacora(
      user,
      'ACTIVOS_CREAR',
      'activos',
      saved.id,
      null,
      {
        codigoActivo: saved.codigoActivo,
        nombre: saved.nombre,
        estado: saved.estado,
      },
    );

    return saved;
  }

  async findAll(user: AuthenticatedUser): Promise<Activo[]> {
    const whereBase = {
      deletedAt: IsNull(),
    };

    return this.activosRepository.find({
      where: { ...whereBase, empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<Activo> {
    const activo = await this.activosRepository.findOne({
      where: {
        id,
        empresaId: user.empresaId,
        deletedAt: IsNull(),
      },
    });

    if (!activo) {
      throw new NotFoundException(`Activo ${id} no encontrado`);
    }

    return activo;
  }

  async update(
    id: string,
    updateActivoDto: UpdateActivoDto,
    user: AuthenticatedUser,
  ): Promise<Activo> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    const payload = updateActivoDto;
    const merged = this.activosRepository.merge(actual, {
      ...payload,
      moneda: payload.moneda ? payload.moneda.toUpperCase() : actual.moneda,
    });
    const saved = await this.activosRepository.save(merged);

    await this.registrarBitacora(
      user,
      'ACTIVOS_ACTUALIZAR',
      'activos',
      saved.id,
      {
        codigoActivo: actual.codigoActivo,
        nombre: actual.nombre,
        estado: actual.estado,
      },
      {
        codigoActivo: saved.codigoActivo,
        nombre: saved.nombre,
        estado: saved.estado,
      },
    );

    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    const activeAssignment = await this.asignacionRecursosRepository.findOne({
      where: {
        empresaId: user.empresaId,
        activoId: actual.id,
        estaActivo: true,
      },
    });
    if (activeAssignment) {
      throw new BadRequestException(
        'No se puede desactivar el activo porque tiene una asignación activa.',
      );
    }

    actual.deletedAt = new Date();
    actual.estaActivo = false;
    actual.estado = 'dado_de_baja';

    await this.activosRepository.save(actual);

    await this.registrarBitacora(
      user,
      'ACTIVOS_DESACTIVAR',
      'activos',
      actual.id,
      {
        estado: 'activo',
      },
      {
        estado: actual.estado,
        estaActivo: actual.estaActivo,
        deletedAt: actual.deletedAt.toISOString(),
      },
    );
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
}
