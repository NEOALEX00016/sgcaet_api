import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFormularioCampoDto } from './dto/create-formulario-campo.dto';
import { UpdateFormularioCampoDto } from './dto/update-formulario-campo.dto';
import { FormularioCampo } from './entities/formulario-campo.entity';
import { FormularioVersione } from '../formulario-versiones/entities/formulario-versione.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class FormularioCamposService {
  constructor(
    @InjectRepository(FormularioCampo)
    private readonly campos: Repository<FormularioCampo>,
    @InjectRepository(FormularioVersione)
    private readonly versiones: Repository<FormularioVersione>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacora: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async create(
    dto: CreateFormularioCampoDto,
    user: AuthenticatedUser,
  ): Promise<FormularioCampo> {
    this.validarClaims(dto.empresaId, dto.usuarioActorId, user);
    await this.validarVersionEditable(dto.formularioVersionId, user.empresaId);
    this.validarRequeridoPorTipo(dto.tipoCampo, dto.requerido);

    const payload = this.normalizarPayload(dto);
    const existente = await this.campos.findOne({
      where: {
        formularioVersionId: payload.formularioVersionId,
        clave: payload.clave,
      },
    });
    if (existente)
      throw new BadRequestException(
        'La clave ya existe en la version indicada',
      );
    await this.validarOrdenUnico(payload.formularioVersionId, payload.orden);
    const {
      empresaId: _empresaId,
      usuarioActorId: _usuarioActorId,
      ...clean
    } = payload;
    const saved = await this.campos.save(
      this.campos.create({
        ...clean,
        empresaId: user.empresaId,
        requerido: payload.requerido ?? false,
      }),
    );
    await this.registrar(
      user,
      'FORMULARIO_CAMPOS_CREAR',
      saved.id,
      null,
      saved,
    );
    return saved;
  }

  findAll(
    empresaId: string,
    formularioVersionId?: string,
  ): Promise<FormularioCampo[]> {
    return this.campos.find({
      where: {
        empresaId,
        ...(formularioVersionId ? { formularioVersionId } : {}),
      },
      order: { orden: 'ASC' },
    });
  }

  async findOne(id: string, empresaId: string): Promise<FormularioCampo> {
    const item = await this.campos.findOne({ where: { id, empresaId } });
    if (!item)
      throw new NotFoundException(`Formulario campo ${id} no encontrado`);
    return item;
  }

  async update(
    id: string,
    dto: UpdateFormularioCampoDto,
    user: AuthenticatedUser,
  ): Promise<FormularioCampo> {
    this.validarClaims(dto.empresaId, dto.usuarioActorId, user);
    const actual = await this.findOne(id, user.empresaId);

    const payload = this.normalizarPayload(dto);

    const formularioVersionId = payload.formularioVersionId ?? actual.formularioVersionId;
    await this.validarVersionEditable(formularioVersionId, user.empresaId);
    this.validarRequeridoPorTipo(payload.tipoCampo ?? actual.tipoCampo, payload.requerido ?? actual.requerido);

    if (
      payload.clave &&
      (
        await this.campos.findOne({
          where: {
            formularioVersionId,
            clave: payload.clave,
          },
        })
      )?.id !== id
    ) {
      throw new BadRequestException(
        'La clave ya existe en la version indicada',
      );
    }
    if (typeof payload.orden === 'number') {
      await this.validarOrdenUnico(formularioVersionId, payload.orden, id);
    }

    const {
      empresaId: _empresaId,
      usuarioActorId: _usuarioActorId,
      ...clean
    } = payload;
    const saved = await this.campos.save(this.campos.merge(actual, clean));
    await this.registrar(
      user,
      'FORMULARIO_CAMPOS_ACTUALIZAR',
      saved.id,
      actual,
      saved,
    );
    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user.empresaId);
    await this.validarVersionEditable(actual.formularioVersionId, user.empresaId);
    await this.campos.delete({ id: actual.id, empresaId: user.empresaId });
    await this.registrar(
      user,
      'FORMULARIO_CAMPOS_ELIMINAR',
      actual.id,
      actual,
      null,
    );
  }

  private async validarVersionEditable(
    id: string,
    empresaId: string,
  ): Promise<void> {
    const version = await this.versiones.findOne({ where: { id, empresaId } });
    if (!version)
      throw new NotFoundException(
        'Formulario version no encontrada para la empresa indicada',
      );
    if (version.estado !== 'borrador') {
      throw new BadRequestException(
        'Solo se permite editar campos cuando la version esta en borrador',
      );
    }
  }

  private async validarOrdenUnico(
    formularioVersionId: string,
    orden: number,
    excludeId?: string,
  ): Promise<void> {
    const existente = await this.campos.findOne({
      where: { formularioVersionId, orden },
    });
    if (existente && existente.id !== excludeId) {
      throw new BadRequestException(
        `El orden ${orden} ya existe en la version indicada`,
      );
    }
  }

  private validarRequeridoPorTipo(tipoCampo: string, requerido?: boolean): void {
    if ((tipoCampo === 'label' || tipoCampo === 'separator') && requerido) {
      throw new BadRequestException(
        `El tipo ${tipoCampo} no puede marcarse como requerido`,
      );
    }
  }

  private normalizarPayload<
    T extends CreateFormularioCampoDto | UpdateFormularioCampoDto,
  >(payload: T): T {
    const next = { ...payload } as T;

    if (typeof next.clave === 'string') {
      next.clave = next.clave.trim().toLowerCase();
    }
    if (typeof next.etiqueta === 'string') {
      next.etiqueta = next.etiqueta.trim();
    }
    if (typeof next.tipoCampo === 'string') {
      next.tipoCampo = next.tipoCampo.trim().toLowerCase();
    }

    return next;
  }

  private validarClaims(
    empresaId: string | undefined,
    actorId: string | undefined,
    user: AuthenticatedUser,
  ): void {
    if (empresaId && empresaId !== user.empresaId)
      throw new ForbiddenException(
        'El tenant no coincide con el tenant autenticado',
      );
    if (actorId && actorId !== user.userId)
      throw new ForbiddenException(
        'El actor no coincide con el usuario autenticado',
      );
  }

  private async registrar(
    user: AuthenticatedUser,
    accion: string,
    id: string,
    anterior: unknown,
    nuevo: unknown,
  ): Promise<void> {
    await this.bitacora.save(
      this.bitacora.create({
        empresaId: user.empresaId,
        usuarioActorId: user.userId,
        accion,
        entidad: 'formulario_campos',
        entidadId: id,
        valoresAnteriores: (anterior as Record<string, unknown>) ?? undefined,
        valoresNuevos: (nuevo as Record<string, unknown>) ?? undefined,
        resultado: 'exito',
      }),
    );
  }
}
