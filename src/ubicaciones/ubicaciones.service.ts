import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUbicacioneDto } from './dto/create-ubicacione.dto';
import { UpdateUbicacioneDto } from './dto/update-ubicacione.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Ubicacione } from './entities/ubicacione.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class UbicacionesService {
  constructor(
    @InjectRepository(Ubicacione)
    private readonly ubicacionesRepository: Repository<Ubicacione>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async create(
    createUbicacioneDto: CreateUbicacioneDto,
    user: AuthenticatedUser,
  ): Promise<Ubicacione> {
    await this.validarActor(user);

    const ubicacion = this.ubicacionesRepository.create({
      ...createUbicacioneDto,
      empresaId: user.empresaId,
      estaActiva: createUbicacioneDto.estaActiva ?? true,
      latitud: createUbicacioneDto.latitud,
      longitud: createUbicacioneDto.longitud,
    });
    const saved = await this.ubicacionesRepository.save(ubicacion);

    await this.registrarBitacora(
      user,
      'UBICACIONES_CREAR',
      'ubicaciones',
      saved.id,
      null,
      {
        codigo: saved.codigo,
        nombre: saved.nombre,
        estaActiva: saved.estaActiva,
      },
    );

    return saved;
  }

  async findAll(user: AuthenticatedUser): Promise<Ubicacione[]> {
    return this.ubicacionesRepository.find({
      where: { empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<Ubicacione> {
    const ubicacion = await this.ubicacionesRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!ubicacion) {
      throw new NotFoundException(`Ubicacion ${id} no encontrada`);
    }

    return ubicacion;
  }

  async update(
    id: string,
    updateUbicacioneDto: UpdateUbicacioneDto,
    user: AuthenticatedUser,
  ): Promise<Ubicacione> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    const merged = this.ubicacionesRepository.merge(
      actual,
      updateUbicacioneDto,
    );
    const saved = await this.ubicacionesRepository.save(merged);

    await this.registrarBitacora(
      user,
      'UBICACIONES_ACTUALIZAR',
      'ubicaciones',
      saved.id,
      {
        nombre: actual.nombre,
        direccion: actual.direccion ?? null,
        estaActiva: actual.estaActiva,
      },
      {
        nombre: saved.nombre,
        direccion: saved.direccion ?? null,
        estaActiva: saved.estaActiva,
      },
    );

    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    actual.estaActiva = false;
    await this.ubicacionesRepository.save(actual);

    await this.registrarBitacora(
      user,
      'UBICACIONES_DESACTIVAR',
      'ubicaciones',
      actual.id,
      {
        estaActiva: true,
      },
      {
        estaActiva: actual.estaActiva,
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
