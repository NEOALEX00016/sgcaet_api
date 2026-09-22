import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFormularioReglaDto } from './dto/create-formulario-regla.dto';
import { UpdateFormularioReglaDto } from './dto/update-formulario-regla.dto';
import { FormularioRegla } from './entities/formulario-regla.entity';
import { FormularioVersione } from '../formulario-versiones/entities/formulario-versione.entity';
import { FormularioCampo } from '../formulario-campos/entities/formulario-campo.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class FormularioReglasService {
  constructor(
    @InjectRepository(FormularioRegla)
    private readonly reglas: Repository<FormularioRegla>,
    @InjectRepository(FormularioVersione)
    private readonly versiones: Repository<FormularioVersione>,
    @InjectRepository(FormularioCampo)
    private readonly campos: Repository<FormularioCampo>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacora: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async create(
    dto: CreateFormularioReglaDto,
    user: AuthenticatedUser,
  ): Promise<FormularioRegla> {
    this.validarClaims(dto.empresaId, dto.usuarioActorId, user);
    const payload = this.normalizarPayload(dto);
    this.validarOperador(payload.operador, payload.valorEsperado);
    await this.validarContexto(
      payload.formularioVersionId,
      payload.campoOrigenId,
      payload.campoDestinoId,
      user.empresaId,
    );
    const {
      empresaId: _empresaId,
      usuarioActorId: _usuarioActorId,
      ...clean
    } = payload;
    const saved = await this.reglas.save(
      this.reglas.create({ ...clean, empresaId: user.empresaId }),
    );
    await this.registrar(
      user,
      'FORMULARIO_REGLAS_CREAR',
      saved.id,
      null,
      saved,
    );
    return saved;
  }

  findAll(
    empresaId: string,
    formularioVersionId?: string,
  ): Promise<FormularioRegla[]> {
    return this.reglas.find({
      where: {
        empresaId,
        ...(formularioVersionId ? { formularioVersionId } : {}),
      },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string, empresaId: string): Promise<FormularioRegla> {
    const item = await this.reglas.findOne({ where: { id, empresaId } });
    if (!item)
      throw new NotFoundException(`Formulario regla ${id} no encontrada`);
    return item;
  }

  async update(
    id: string,
    dto: UpdateFormularioReglaDto,
    user: AuthenticatedUser,
  ): Promise<FormularioRegla> {
    this.validarClaims(dto.empresaId, dto.usuarioActorId, user);
    const actual = await this.findOne(id, user.empresaId);
    const payload = this.normalizarPayload(dto);
    const versionId = payload.formularioVersionId ?? actual.formularioVersionId;
    const origenId = payload.campoOrigenId ?? actual.campoOrigenId;
    const destinoId = payload.campoDestinoId ?? actual.campoDestinoId;
    this.validarOperador(payload.operador ?? actual.operador, payload.valorEsperado ?? actual.valorEsperado);
    await this.validarContexto(versionId, origenId, destinoId, user.empresaId);
    const {
      empresaId: _empresaId,
      usuarioActorId: _usuarioActorId,
      ...clean
    } = payload;
    const saved = await this.reglas.save(this.reglas.merge(actual, clean));
    await this.registrar(
      user,
      'FORMULARIO_REGLAS_ACTUALIZAR',
      saved.id,
      actual,
      saved,
    );
    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user.empresaId);
    await this.validarVersionEditable(actual.formularioVersionId, user.empresaId);
    await this.reglas.delete({ id: actual.id, empresaId: user.empresaId });
    await this.registrar(
      user,
      'FORMULARIO_REGLAS_ELIMINAR',
      actual.id,
      actual,
      null,
    );
  }

  private async validarContexto(
    versionId: string,
    origenId: string,
    destinoId: string,
    empresaId: string,
  ): Promise<void> {
    if (origenId === destinoId)
      throw new BadRequestException(
        'Los campos origen y destino deben pertenecer a la misma version y ser distintos',
      );

    await this.validarVersionEditable(versionId, empresaId);

    const origen = await this.campos.findOne({
      where: { id: origenId, formularioVersionId: versionId, empresaId },
    });
    const destino = await this.campos.findOne({
      where: { id: destinoId, formularioVersionId: versionId, empresaId },
    });
    if (!origen || !destino) {
      throw new BadRequestException(
        'Los campos origen y destino deben pertenecer a la misma version y ser distintos',
      );
    }
  }

  private async validarVersionEditable(
    versionId: string,
    empresaId: string,
  ): Promise<void> {
    const version = await this.versiones.findOne({
      where: { id: versionId, empresaId },
    });
    if (!version)
      throw new NotFoundException(
        'Formulario version no encontrada para la empresa indicada',
      );
    if (version.estado !== 'borrador') {
      throw new BadRequestException(
        'Solo se permite editar reglas cuando la version esta en borrador',
      );
    }
  }

  private validarOperador(operador: string, valorEsperado?: string): void {
    const allowed = [
      'equals',
      'not_equals',
      'contains',
      'not_contains',
      'starts_with',
      'ends_with',
      'gt',
      'gte',
      'lt',
      'lte',
      'is_true',
      'is_false',
      'is_empty',
      'is_not_empty',
    ];
    if (!allowed.includes(operador)) {
      throw new BadRequestException(
        `Operador no soportado: ${operador}`,
      );
    }

    const unary = ['is_true', 'is_false', 'is_empty', 'is_not_empty'];
    if (!unary.includes(operador) && !valorEsperado?.trim()) {
      throw new BadRequestException(
        `El operador ${operador} requiere valorEsperado`,
      );
    }
  }

  private normalizarPayload<
    T extends CreateFormularioReglaDto | UpdateFormularioReglaDto,
  >(payload: T): T {
    const next = { ...payload } as T;

    if (typeof next.operador === 'string') {
      next.operador = next.operador.trim().toLowerCase();
    }
    if (typeof next.accion === 'string') {
      next.accion = next.accion.trim().toLowerCase();
    }
    if (typeof next.valorEsperado === 'string') {
      next.valorEsperado = next.valorEsperado.trim();
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
        entidad: 'formulario_reglas',
        entidadId: id,
        valoresAnteriores: (anterior as Record<string, unknown>) ?? undefined,
        valoresNuevos: (nuevo as Record<string, unknown>) ?? undefined,
        resultado: 'exito',
      }),
    );
  }
}
