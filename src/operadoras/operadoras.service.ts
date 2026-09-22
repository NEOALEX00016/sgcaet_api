import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOperadoraDto } from './dto/create-operadora.dto';
import { UpdateOperadoraDto } from './dto/update-operadora.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Operadora } from './entities/operadora.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class OperadorasService {
  constructor(
    @InjectRepository(Operadora)
    private readonly operadorasRepository: Repository<Operadora>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async create(
    createOperadoraDto: CreateOperadoraDto,
    user: AuthenticatedUser,
  ): Promise<Operadora> {
    await this.validarActor(user);

    const operadora = this.operadorasRepository.create({
      ...createOperadoraDto,
      empresaId: user.empresaId,
      pais: createOperadoraDto.pais?.toUpperCase() ?? 'DO',
      estaActiva: createOperadoraDto.estaActiva ?? true,
    });
    const saved = await this.operadorasRepository.save(operadora);

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'OPERADORAS_CREAR',
      'operadoras',
      saved.id,
      null,
      {
        codigo: saved.codigo,
        nombre: saved.nombre,
        pais: saved.pais,
        estaActiva: saved.estaActiva,
      },
    );

    return saved;
  }

  async findAll(user: AuthenticatedUser): Promise<Operadora[]> {
    return this.operadorasRepository.find({
      where: { empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<Operadora> {
    const operadora = await this.operadorasRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!operadora) {
      throw new NotFoundException(`Operadora ${id} no encontrada`);
    }

    return operadora;
  }

  async update(
    id: string,
    updateOperadoraDto: UpdateOperadoraDto,
    user: AuthenticatedUser,
  ): Promise<Operadora> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    const merged = this.operadorasRepository.merge(actual, {
      ...updateOperadoraDto,
      pais: updateOperadoraDto.pais
        ? updateOperadoraDto.pais.toUpperCase()
        : actual.pais,
    });
    const saved = await this.operadorasRepository.save(merged);

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'OPERADORAS_ACTUALIZAR',
      'operadoras',
      saved.id,
      {
        nombre: actual.nombre,
        pais: actual.pais,
        estaActiva: actual.estaActiva,
      },
      {
        nombre: saved.nombre,
        pais: saved.pais,
        estaActiva: saved.estaActiva,
      },
    );

    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    actual.estaActiva = false;
    await this.operadorasRepository.save(actual);

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'OPERADORAS_DESACTIVAR',
      'operadoras',
      actual.id,
      {
        estaActiva: true,
      },
      {
        estaActiva: actual.estaActiva,
      },
    );
  }

  async destroy(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);
    await this.operadorasRepository.delete({ id, empresaId: user.empresaId });
    await this.registrarBitacora(user.userId, user.empresaId, 'OPERADORAS_ELIMINAR', 'operadoras', actual.id, { codigo: actual.codigo, nombre: actual.nombre }, null);
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
