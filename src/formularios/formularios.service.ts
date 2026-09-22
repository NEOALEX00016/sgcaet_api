import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateFormularioDto } from './dto/create-formulario.dto';
import { UpdateFormularioDto } from './dto/update-formulario.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Formulario } from './entities/formulario.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class FormulariosService {
  constructor(
    @InjectRepository(Formulario)
    private readonly formulariosRepository: Repository<Formulario>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async create(
    createFormularioDto: CreateFormularioDto,
    user: AuthenticatedUser,
  ): Promise<Formulario> {
    const payload = this.normalizarPayload(createFormularioDto);
    await this.validarCodigoDisponible(user.empresaId, payload.codigo);
    const formulario = this.formulariosRepository.create({
      ...payload,
      empresaId: user.empresaId,
      estaActivo: payload.estaActivo ?? true,
    });
    const saved = await this.formulariosRepository.save(formulario);

    await this.registrarBitacora(
      user,
      'FORMULARIOS_CREAR',
      'formularios',
      saved.id,
      null,
      {
        codigo: saved.codigo,
        tipoUso: saved.tipoUso,
        estaActivo: saved.estaActivo,
      },
    );

    return saved;
  }

  async findAll(user: AuthenticatedUser): Promise<Formulario[]> {
    return this.formulariosRepository.find({
      where: { empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<Formulario> {
    const formulario = await this.formulariosRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!formulario) {
      throw new NotFoundException(`Formulario ${id} no encontrado`);
    }

    return formulario;
  }

  async update(
    id: string,
    updateFormularioDto: UpdateFormularioDto,
    user: AuthenticatedUser,
  ): Promise<Formulario> {
    const actual = await this.findOne(id, user);
    const payload = this.normalizarPayload(updateFormularioDto);

    if (payload.codigo && payload.codigo !== actual.codigo) {
      await this.validarCodigoDisponible(user.empresaId, payload.codigo, id);
    }

    const merged = this.formulariosRepository.merge(actual, payload);
    const saved = await this.formulariosRepository.save(merged);

    await this.registrarBitacora(
      user,
      'FORMULARIOS_ACTUALIZAR',
      'formularios',
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

    actual.estaActivo = false;
    await this.formulariosRepository.save(actual);

    await this.registrarBitacora(
      user,
      'FORMULARIOS_DESACTIVAR',
      'formularios',
      actual.id,
      {
        estaActivo: true,
      },
      {
        estaActivo: actual.estaActivo,
      },
    );
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

  private normalizarPayload<T extends CreateFormularioDto | UpdateFormularioDto>(
    payload: T,
  ): T {
    const next = { ...payload } as T;

    if (typeof next.codigo === 'string') {
      next.codigo = next.codigo.trim().toUpperCase();
    }
    if (typeof next.nombre === 'string') {
      next.nombre = next.nombre.trim();
    }
    if (typeof next.descripcion === 'string') {
      next.descripcion = next.descripcion.trim();
    }
    if (typeof next.tipoUso === 'string') {
      next.tipoUso = next.tipoUso.trim().toLowerCase();
    }

    return next;
  }

  private async validarCodigoDisponible(
    empresaId: string,
    codigo: string,
    excludeId?: string,
  ): Promise<void> {
    const existente = await this.formulariosRepository.findOne({
      where: { empresaId, codigo },
      withDeleted: true,
    });

    if (existente && existente.id !== excludeId) {
      throw new ConflictException(
        `Ya existe un formulario con codigo ${codigo}`,
      );
    }
  }
}
