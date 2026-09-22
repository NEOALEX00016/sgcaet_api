import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDepartamentoDto } from './dto/create-departamento.dto';
import { UpdateDepartamentoDto } from './dto/update-departamento.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Departamento } from './entities/departamento.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class DepartamentosService {
  constructor(
    @InjectRepository(Departamento)
    private readonly departamentosRepository: Repository<Departamento>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async create(
    createDepartamentoDto: CreateDepartamentoDto,
    user: AuthenticatedUser,
  ): Promise<Departamento> {
    await this.validarActor(user);

    const departamento = this.departamentosRepository.create({
      ...createDepartamentoDto,
      empresaId: user.empresaId,
      estaActivo: createDepartamentoDto.estaActivo ?? true,
    });
    const saved = await this.departamentosRepository.save(departamento);

    await this.registrarBitacora(
      user,
      'DEPARTAMENTOS_CREAR',
      'departamentos',
      saved.id,
      null,
      {
        codigo: saved.codigo,
        nombre: saved.nombre,
        estaActivo: saved.estaActivo,
      },
    );

    return saved;
  }

  async findAll(user: AuthenticatedUser): Promise<Departamento[]> {
    return this.departamentosRepository.find({
      where: { empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<Departamento> {
    const departamento = await this.departamentosRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!departamento) {
      throw new NotFoundException(`Departamento ${id} no encontrado`);
    }

    return departamento;
  }

  async update(
    id: string,
    updateDepartamentoDto: UpdateDepartamentoDto,
    user: AuthenticatedUser,
  ): Promise<Departamento> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    const merged = this.departamentosRepository.merge(
      actual,
      updateDepartamentoDto,
    );
    const saved = await this.departamentosRepository.save(merged);

    await this.registrarBitacora(
      user,
      'DEPARTAMENTOS_ACTUALIZAR',
      'departamentos',
      saved.id,
      {
        nombre: actual.nombre,
        descripcion: actual.descripcion ?? null,
        estaActivo: actual.estaActivo,
      },
      {
        nombre: saved.nombre,
        descripcion: saved.descripcion ?? null,
        estaActivo: saved.estaActivo,
      },
    );

    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    actual.estaActivo = false;
    await this.departamentosRepository.save(actual);

    await this.registrarBitacora(
      user,
      'DEPARTAMENTOS_DESACTIVAR',
      'departamentos',
      actual.id,
      {
        estaActivo: true,
      },
      {
        estaActivo: actual.estaActivo,
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
