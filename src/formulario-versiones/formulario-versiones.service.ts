import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateFormularioVersioneDto } from './dto/create-formulario-versione.dto';
import { UpdateFormularioVersioneDto } from './dto/update-formulario-versione.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { FormularioVersione } from './entities/formulario-versione.entity';
import { Formulario } from '../formularios/entities/formulario.entity';
import { FormularioCampo } from '../formulario-campos/entities/formulario-campo.entity';
import { FormularioRegla } from '../formulario-reglas/entities/formulario-regla.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class FormularioVersionesService {
  constructor(
    @InjectRepository(FormularioVersione)
    private readonly versionesRepository: Repository<FormularioVersione>,
    @InjectRepository(Formulario)
    private readonly formulariosRepository: Repository<Formulario>,
    @InjectRepository(FormularioCampo)
    private readonly camposRepository: Repository<FormularioCampo>,
    @InjectRepository(FormularioRegla)
    private readonly reglasRepository: Repository<FormularioRegla>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async create(
    createDto: CreateFormularioVersioneDto,
    user: AuthenticatedUser,
  ): Promise<FormularioVersione> {
    await this.validarFormulario(createDto.formularioId, user.empresaId);

    if (createDto.estado && createDto.estado !== 'borrador') {
      throw new BadRequestException(
        'Las versiones nuevas deben crearse en estado borrador',
      );
    }

    const versionNumero =
      createDto.versionNumero ??
      (await this.siguienteVersion(createDto.formularioId));
    await this.validarVersionUnica(createDto.formularioId, versionNumero);

    const payload = createDto;
    const version = this.versionesRepository.create({
      ...payload,
      empresaId: user.empresaId,
      versionNumero,
      estado: 'borrador',
      publicadoEn: undefined,
    });
    const saved = await this.versionesRepository.save(version);

    await this.registrarBitacora(
      user,
      'FORMULARIO_VERSIONES_CREAR',
      'formulario_versiones',
      saved.id,
      null,
      {
        formularioId: saved.formularioId,
        versionNumero: saved.versionNumero,
        estado: saved.estado,
      },
    );

    return saved;
  }

  async findAll(
    user: AuthenticatedUser,
    formularioId?: string,
  ): Promise<FormularioVersione[]> {
    const where: Partial<FormularioVersione> = { empresaId: user.empresaId };
    if (formularioId) {
      where.formularioId = formularioId;
    }

    return this.versionesRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<FormularioVersione> {
    const version = await this.versionesRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!version) {
      throw new NotFoundException(`Formulario version ${id} no encontrada`);
    }

    return version;
  }

  async update(
    id: string,
    updateDto: UpdateFormularioVersioneDto,
    user: AuthenticatedUser,
  ): Promise<FormularioVersione> {
    const actual = await this.findOne(id, user);

    if (updateDto.formularioId && updateDto.formularioId !== actual.formularioId) {
      throw new BadRequestException('No se puede cambiar el formulario de una version');
    }
    if (
      typeof updateDto.versionNumero === 'number' &&
      updateDto.versionNumero !== actual.versionNumero
    ) {
      throw new BadRequestException('No se puede cambiar el numero de version');
    }
    if (updateDto.estado) {
      throw new BadRequestException(
        'Use el endpoint de publicacion para cambiar estado de version',
      );
    }
    if (actual.estado !== 'borrador') {
      throw new BadRequestException(
        'No se puede editar una version que no esta en borrador',
      );
    }

    const payload = updateDto;
    const merged = this.versionesRepository.merge(actual, payload);
    const saved = await this.versionesRepository.save(merged);

    await this.registrarBitacora(
      user,
      'FORMULARIO_VERSIONES_ACTUALIZAR',
      'formulario_versiones',
      saved.id,
      {
        estado: actual.estado,
        publicadoEn: actual.publicadoEn?.toISOString() ?? null,
        plantillaHtml: actual.plantillaHtml ?? null,
      },
      {
        estado: saved.estado,
        publicadoEn: saved.publicadoEn?.toISOString() ?? null,
        plantillaHtml: saved.plantillaHtml ?? null,
      },
    );

    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);

    if (actual.estado !== 'borrador') {
      throw new BadRequestException(
        'Solo se puede eliminar una version en borrador',
      );
    }

    await this.versionesRepository.delete({
      id: actual.id,
      empresaId: user.empresaId,
    });

    await this.registrarBitacora(
      user,
      'FORMULARIO_VERSIONES_ELIMINAR',
      'formulario_versiones',
      actual.id,
      {
        estado: actual.estado,
        versionNumero: actual.versionNumero,
      },
      null,
    );
  }

  async publicar(
    id: string,
    user: AuthenticatedUser,
  ): Promise<FormularioVersione> {
    const actual = await this.findOne(id, user);

    if (actual.estado === 'publicada') {
      return actual;
    }
    if (actual.estado !== 'borrador') {
      throw new BadRequestException(
        'Solo se puede publicar una version en borrador',
      );
    }

    await this.validarVersionPublicable(actual, user.empresaId);

    const versionesPublicadas = await this.versionesRepository.find({
      where: {
        formularioId: actual.formularioId,
        empresaId: user.empresaId,
        estado: 'publicada',
      },
    });

    for (const publicada of versionesPublicadas) {
      publicada.estado = 'archivada';
      await this.versionesRepository.save(publicada);
    }

    actual.estado = 'publicada';
    actual.publicadoEn = new Date();
    const saved = await this.versionesRepository.save(actual);

    await this.registrarBitacora(
      user,
      'FORMULARIO_VERSIONES_PUBLICAR',
      'formulario_versiones',
      saved.id,
      {
        estado: 'borrador',
      },
      {
        estado: saved.estado,
        publicadoEn: saved.publicadoEn?.toISOString() ?? null,
      },
    );

    return saved;
  }

  async preview(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ id: string; estado: string; html: string }> {
    const version = await this.findOne(id, user);
    const html = this.renderVersionHtml(version.plantillaHtml, false);
    return {
      id: version.id,
      estado: version.estado,
      html,
    };
  }

  async print(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ id: string; html: string }> {
    const version = await this.findOne(id, user);
    const html = this.renderVersionHtml(version.plantillaHtml, true);

    return {
      id: version.id,
      html,
    };
  }

  private renderVersionHtml(content: string | null | undefined, printable: boolean): string {
    const safeContent = this.sanitizeHtml(content ?? '');
    const body = safeContent.trim()
      ? safeContent
      : '<section><h1>Formulario sin plantilla</h1><p>No hay contenido HTML configurado para esta version.</p></section>';
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Formulario ${printable ? 'imprimible' : 'preview'}</title><style>${this.baseStyles()}${printable ? this.printStyles() : this.previewStyles()}</style></head><body><main class="form-shell">${body}</main></body></html>`;
  }

  private sanitizeHtml(content: string): string {
    const withoutScripts = content.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
    return withoutScripts.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '');
  }

  private baseStyles(): string {
    return 'body{font-family:Arial,sans-serif;font-size:12px;line-height:1.45;color:#111;margin:0;padding:0;background:#fff;}*{box-sizing:border-box;}h1,h2,h3{margin:0 0 8px;}p{margin:0 0 8px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ccc;padding:6px;vertical-align:top;}.form-shell{max-width:980px;margin:0 auto;padding:20px;}';
  }

  private previewStyles(): string {
    return '.form-shell{background:#fff;}';
  }

  private printStyles(): string {
    return '@page{size:auto;margin:12mm;} .form-shell{padding:0;}';
  }

  private async siguienteVersion(formularioId: string): Promise<number> {
    const ultima = await this.versionesRepository.findOne({
      where: { formularioId },
      order: { versionNumero: 'DESC' },
    });

    return (ultima?.versionNumero ?? 0) + 1;
  }

  private async validarVersionUnica(
    formularioId: string,
    versionNumero: number,
  ): Promise<void> {
    const existe = await this.versionesRepository.findOne({
      where: { formularioId, versionNumero },
    });
    if (existe) {
      throw new BadRequestException(
        `Ya existe la version ${versionNumero} para el formulario indicado`,
      );
    }
  }

  private async validarFormulario(
    formularioId: string,
    empresaId: string,
  ): Promise<void> {
    const formulario = await this.formulariosRepository.findOne({
      where: {
        id: formularioId,
        empresaId,
      },
    });

    if (!formulario) {
      throw new NotFoundException(
        'Formulario no encontrado para la empresa indicada',
      );
    }
  }

  private async validarVersionPublicable(
    version: FormularioVersione,
    empresaId: string,
  ): Promise<void> {
    if (!(version.plantillaHtml ?? '').trim()) {
      throw new BadRequestException(
        'No se puede publicar una version sin plantillaHtml',
      );
    }

    const campos = await this.camposRepository.find({
      where: { formularioVersionId: version.id, empresaId },
      order: { orden: 'ASC' },
    });
    if (campos.length === 0) {
      throw new BadRequestException(
        'No se puede publicar una version sin campos definidos',
      );
    }

    const ordenes = new Set<number>();
    for (const campo of campos) {
      if (ordenes.has(campo.orden)) {
        throw new BadRequestException(
          'No se puede publicar una version con orden de campos duplicado',
        );
      }
      ordenes.add(campo.orden);
    }

    const reglas = await this.reglasRepository.find({
      where: { formularioVersionId: version.id, empresaId },
    });
    const camposIds = new Set(campos.map((campo) => campo.id));
    for (const regla of reglas) {
      if (
        regla.campoOrigenId === regla.campoDestinoId ||
        !camposIds.has(regla.campoOrigenId) ||
        !camposIds.has(regla.campoDestinoId)
      ) {
        throw new BadRequestException(
          'No se puede publicar una version con reglas invalidas',
        );
      }
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
