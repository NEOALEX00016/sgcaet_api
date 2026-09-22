import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';
import { ActaAsignacion } from './entities/acta-asignacion.entity';
import { ActaAsignacionRecurso } from './entities/acta-asignacion-recurso.entity';
import { PoliticaFormularioAsignacion } from '../politicas-formulario-asignacion/entities/politicas-formulario-asignacion.entity';
import { FormularioVersione } from '../formulario-versiones/entities/formulario-versione.entity';
import { Activo } from '../activos/entities/activo.entity';
import { TiposActivo } from '../tipos-activo/entities/tipos-activo.entity';
import { CategoriaEquipo } from '../categorias-equipo/entities/categoria-equipo.entity';
import { DominioCatalogoActivo } from '../dominios-catalogo-activos/entities/dominio-catalogo-activo.entity';
import { DocumentEntity } from '../documents/entities/document.entity';
import { Formulario } from '../formularios/entities/formulario.entity';
import { Persona } from '../personas/entities/persona.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Departamento } from '../departamentos/entities/departamento.entity';
import { AtributosDinamicosActivo } from '../atributos-dinamicos-activo/entities/atributos-dinamicos-activo.entity';
import { EspecificacionTipoActivo } from '../especificaciones-tipo-activo/entities/especificacion-tipo-activo.entity';

@Injectable()
export class ActasAsignacionService {
  constructor(
    @InjectRepository(Asignacion)
    private readonly asignacionesRepository: Repository<Asignacion>,
    @InjectRepository(AsignacionRecurso)
    private readonly recursosRepository: Repository<AsignacionRecurso>,
    @InjectRepository(ActaAsignacion)
    private readonly actasRepository: Repository<ActaAsignacion>,
    @InjectRepository(ActaAsignacionRecurso)
    private readonly actaRecursosRepository: Repository<ActaAsignacionRecurso>,
    @InjectRepository(PoliticaFormularioAsignacion)
    private readonly politicasRepository: Repository<PoliticaFormularioAsignacion>,
    @InjectRepository(FormularioVersione)
    private readonly versionesRepository: Repository<FormularioVersione>,
    @InjectRepository(Activo)
    private readonly activosRepository: Repository<Activo>,
    @InjectRepository(TiposActivo)
    private readonly tiposActivosRepository: Repository<TiposActivo>,
    @InjectRepository(CategoriaEquipo)
    private readonly categoriasRepository: Repository<CategoriaEquipo>,
    @InjectRepository(DominioCatalogoActivo)
    private readonly dominiosRepository: Repository<DominioCatalogoActivo>,
    @InjectRepository(DocumentEntity)
    private readonly documentsRepository: Repository<DocumentEntity>,
    @InjectRepository(Formulario)
    private readonly formulariosRepository: Repository<Formulario>,
    @InjectRepository(Persona)
    private readonly personasRepository: Repository<Persona>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(Departamento)
    private readonly departamentosRepository: Repository<Departamento>,
    @InjectRepository(AtributosDinamicosActivo)
    private readonly atributosRepository: Repository<AtributosDinamicosActivo>,
    @InjectRepository(EspecificacionTipoActivo)
    private readonly especificacionesRepository: Repository<EspecificacionTipoActivo>,
  ) {}

  async prepararEntrega(asignacionId: string, user: AuthenticatedUser) {
    const asignacion = await this.asignacionesRepository.findOne({
      where: { id: asignacionId, empresaId: user.empresaId },
    });
    if (!asignacion) {
      throw new NotFoundException('Asignacion no encontrada');
    }
    if (!asignacion.tipoAsignacionId) {
      throw new BadRequestException(
        'La asignacion no tiene tipoAsignacionId para resolver formularios.',
      );
    }
    if (asignacion.estado !== 'autorizada') {
      throw new BadRequestException(
        'La asignacion debe estar autorizada para preparar la entrega.',
      );
    }

    const recursos = await this.recursosRepository.find({
      where: {
        empresaId: user.empresaId,
        asignacionId: asignacion.id,
        estaActivo: true,
      },
    });
    if (!recursos.length) {
      throw new BadRequestException(
        'La asignacion no tiene recursos activos para preparar actas.',
      );
    }

    const agrupado = new Map<string, { dominio: 'equipos' | 'telecom'; recursos: AsignacionRecurso[] }>();

    for (const recurso of recursos) {
      const policy = await this.resolvePolicy(asignacion.tipoAsignacionId, recurso, user);
      if (!policy) {
        throw new BadRequestException(
          `No existe politica de formulario para recurso ${recurso.id}.`,
        );
      }

      const version = await this.resolvePublishedVersion(
        policy.formularioId,
        user.empresaId,
      );
      if (!version) {
        throw new BadRequestException(
          `No existe version publicada para formulario ${policy.formularioId}.`,
        );
      }

       const dominio = recurso.tipoRecurso === 'linea' ? 'telecom' : 'equipos';
       const key = `${version.id}:${dominio}`;
       const current = agrupado.get(key) ?? { dominio, recursos: [] };
       current.recursos.push(recurso);
       agrupado.set(key, current);
    }

    const actas: ActaAsignacion[] = [];
    for (const [key, group] of agrupado.entries()) {
      const formularioVersionId = key.split(':')[0];
      const { dominio, recursos: recursosActa } = group;
      const acta =
        (await this.actasRepository.findOne({
          where: {
            empresaId: user.empresaId,
            asignacionId: asignacion.id,
            formularioVersionId,
            dominio,
          },
        })) ??
        (await this.actasRepository.save(
          this.actasRepository.create({
            empresaId: user.empresaId,
            asignacionId: asignacion.id,
            formularioVersionId,
            dominio,
            estado: 'pendiente_firma',
          }),
        ));

      for (const recurso of recursosActa) {
        const exists = await this.actaRecursosRepository.findOne({
          where: {
            empresaId: user.empresaId,
            actaAsignacionId: acta.id,
            asignacionRecursoId: recurso.id,
          },
        });
        if (!exists) {
          await this.actaRecursosRepository.save(
            this.actaRecursosRepository.create({
              empresaId: user.empresaId,
              actaAsignacionId: acta.id,
              asignacionRecursoId: recurso.id,
            }),
          );
        }
      }

      actas.push(acta);
    }

    return {
      asignacionId: asignacion.id,
      totalActas: actas.length,
      actas,
    };
  }

  async findByAsignacion(asignacionId: string, user: AuthenticatedUser) {
    const actas = await this.actasRepository.find({
      where: { asignacionId, empresaId: user.empresaId },
      order: { createdAt: 'ASC' },
    });

    return Promise.all(
      actas.map(async (acta) => {
        const version = await this.versionesRepository.findOne({
          where: {
            id: acta.formularioVersionId,
            empresaId: user.empresaId,
          },
        });
        const formulario = version
          ? await this.formulariosRepository.findOne({
              where: {
                id: version.formularioId,
                empresaId: user.empresaId,
              },
            })
          : null;
        const links = await this.actaRecursosRepository.find({
          where: {
            empresaId: user.empresaId,
            actaAsignacionId: acta.id,
          },
        });
        const recursos = links.length
          ? await this.recursosRepository.find({
              where: {
                empresaId: user.empresaId,
                asignacionId: acta.asignacionId,
              },
            })
          : [];
        const linkedIds = new Set(links.map((item) => item.asignacionRecursoId));

        return {
          ...acta,
          formulario: formulario
            ? { id: formulario.id, codigo: formulario.codigo, nombre: formulario.nombre }
            : undefined,
          versionNumero: version?.versionNumero,
          recursos: recursos
            .filter((item) => linkedIds.has(item.id))
            .map((item) => ({
              id: item.id,
              tipoRecurso: item.tipoRecurso,
              activoId: item.activoId,
              lineaTelefonicaId: item.lineaTelefonicaId,
            })),
        };
      }),
    );
  }

  async imprimirActa(actaId: string, user: AuthenticatedUser) {
    const acta = await this.actasRepository.findOne({
      where: { id: actaId, empresaId: user.empresaId },
    });
    if (!acta) {
      throw new NotFoundException('Acta no encontrada');
    }

    const version = await this.versionesRepository.findOne({
      where: { id: acta.formularioVersionId, empresaId: user.empresaId },
    });
    if (!version) {
      throw new NotFoundException('Version de formulario congelada no encontrada');
    }

    const template = await this.renderActaTemplate(acta, version.plantillaHtml ?? '', user);
    const html = this.wrapPrintableHtml(template);
    return {
      actaId: acta.id,
      formularioVersionId: acta.formularioVersionId,
      html,
    };
  }

  private async renderActaTemplate(
    acta: ActaAsignacion,
    template: string,
    user: AuthenticatedUser,
  ): Promise<string> {
    const assignment = await this.asignacionesRepository.findOne({
      where: { id: acta.asignacionId, empresaId: user.empresaId },
    });
    if (!assignment) throw new NotFoundException('Asignacion del acta no encontrada');

    const person = assignment.personaId
      ? await this.personasRepository.findOne({
          where: { id: assignment.personaId, empresaId: user.empresaId },
        })
      : null;
    const department = assignment.departamentoId
      ? await this.departamentosRepository.findOne({
          where: { id: assignment.departamentoId, empresaId: user.empresaId },
        })
      : null;
    const actor = await this.usuariosRepository.findOne({
      where: { id: assignment.entregadoPor ?? assignment.autorizadoPor ?? user.userId, empresaId: user.empresaId },
    });
    const links = await this.actaRecursosRepository.find({
      where: { empresaId: user.empresaId, actaAsignacionId: acta.id },
    });
    const resources = links.length
      ? await this.recursosRepository.find({
          where: { id: In(links.map((item) => item.asignacionRecursoId)), empresaId: user.empresaId },
        })
      : [];
    const assetResource = resources.find((item) => item.activoId);
    const asset = assetResource?.activoId
      ? await this.activosRepository.findOne({ where: { id: assetResource.activoId, empresaId: user.empresaId } })
      : null;
    const assetType = asset
      ? await this.tiposActivosRepository.findOne({ where: { id: asset.tipoActivoId, empresaId: user.empresaId } })
      : null;
    const attributes = asset
      ? await this.atributosRepository.find({ where: { activoId: asset.id, empresaId: user.empresaId } })
      : [];
    const definitions = assetType
      ? await this.especificacionesRepository.find({
          where: [
            { empresaId: user.empresaId, tipoActivoId: assetType.id },
            ...(assetType.categoriaEquipoId
              ? [{ empresaId: user.empresaId, categoriaEquipoId: assetType.categoriaEquipoId }]
              : []),
          ],
        })
      : [];
    const definitionByKey = new Map(definitions.map((item) => [item.clave, item.nombre]));
    const capacities = attributes.map((attribute) => {
      const value = attribute.valorTexto
        ?? (attribute.valorNumero !== undefined
          ? `${Number(attribute.valorNumero)}${attribute.unidad ? ` ${attribute.unidad}` : ''}`
          : attribute.valorFecha ?? (attribute.valorBooleano === undefined ? '' : attribute.valorBooleano ? 'Sí' : 'No'));
      return `${definitionByKey.get(attribute.clave) ?? attribute.clave}: ${value}`;
    }).join('<br>');
    const blank = '________________________________';
    const values: Record<string, string> = {
      fecha_entrega: assignment.fechaAsignacion.toLocaleDateString('es-DO'),
      direccion: department?.nombre ?? blank,
      usuario_nombre: person ? `${person.nombres} ${person.apellidos}`.trim() : blank,
      tipo_equipo: assetType?.nombre ?? asset?.nombre ?? blank,
      descripcion_equipo: asset?.nombre ?? assignment.motivo ?? blank,
      marca_modelo: [asset?.marca, asset?.modelo].filter(Boolean).join(' / ') || blank,
      numero_inventario: asset?.codigoActivo ?? blank,
      numero_serie: asset?.serial ?? blank,
      capacidades_equipo: capacities || blank,
      accesorios: blank,
      nota: assignment.observaciones ?? assignment.motivo ?? blank,
      entregado_por: actor ? `${actor.nombres} ${actor.apellidos}`.trim() : blank,
      recibido_por: person ? `${person.nombres} ${person.apellidos}`.trim() : blank,
      firma_entrega: '',
      firma_recibe: '',
    };

    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) =>
      this.escapeHtml(values[key] ?? blank),
    ).replace(/&lt;br&gt;/g, '<br>');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async firmarActa(actaId: string, documentoId: string, user: AuthenticatedUser) {
    const acta = await this.actasRepository.findOne({
      where: { id: actaId, empresaId: user.empresaId },
    });
    if (!acta) {
      throw new NotFoundException('Acta no encontrada');
    }

    const documento = await this.documentsRepository.findOne({
      where: {
        id: documentoId,
        empresaId: user.empresaId,
      },
    });
    if (!documento) {
      throw new NotFoundException('Documento firmado no encontrado');
    }
    if (documento.entidadRelacionada !== 'actas_asignacion') {
      throw new BadRequestException(
        'El documento firmado debe estar vinculado a entidad actas_asignacion',
      );
    }
    if (documento.entidadRelacionadaId !== acta.id) {
      throw new BadRequestException(
        'El documento firmado debe pertenecer al acta indicada',
      );
    }

    acta.documentoId = documento.id;
    acta.estado = 'firmada';
    acta.firmadaEn = new Date();

    const saved = await this.actasRepository.save(acta);
    return {
      id: saved.id,
      asignacionId: saved.asignacionId,
      formularioVersionId: saved.formularioVersionId,
      documentoId: saved.documentoId,
      estado: saved.estado,
      firmadaEn: saved.firmadaEn,
    };
  }

  private wrapPrintableHtml(content: string): string {
    return `<!doctype html><html><head><meta charset="utf-8"><title>Acta imprimible</title><style>@page{size:auto;margin:12mm;}body{font-family:Arial,sans-serif;font-size:12px;line-height:1.4;color:#111;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ccc;padding:6px;}h1,h2,h3{margin:0 0 8px;}*{box-sizing:border-box;}</style></head><body>${content}</body></html>`;
  }

  private async resolvePolicy(
    tipoAsignacionId: string,
    recurso: AsignacionRecurso,
    user: AuthenticatedUser,
  ) {
    const scope = await this.resolveScopeForResource(recurso, user.empresaId);
    const baseWhere = {
      empresaId: user.empresaId,
      tipoAsignacionId,
      estaActiva: true,
    };

    if (scope.categoriaId) {
      const categoryPolicies = await this.politicasRepository.find({
        where: { ...baseWhere, categoriaId: scope.categoriaId },
      });
      const byCategoria = categoryPolicies.find((item) =>
        item.dominioId ? item.dominioId === scope.dominioId : true,
      );
      if (byCategoria) return byCategoria;
    }

    if (scope.dominioId) {
      const byDominio = (
        await this.politicasRepository.find({
          where: {
            ...baseWhere,
            dominioId: scope.dominioId,
          },
        })
      ).find((item) => !item.categoriaId);
      if (byDominio) return byDominio;
    }

    const general = await this.politicasRepository.find({ where: baseWhere });
    return general.find((item) => !item.categoriaId && !item.dominioId);
  }

  private async resolvePublishedVersion(formularioId: string, empresaId: string) {
    const versions = await this.versionesRepository.find({
      where: { formularioId, empresaId, estado: 'publicada' },
      order: { versionNumero: 'DESC' },
    });
    return versions[0];
  }

  private async resolveScopeForResource(
    recurso: AsignacionRecurso,
    empresaId: string,
  ): Promise<{ dominioId?: string; categoriaId?: string }> {
    if (recurso.activoId) {
      const activo = await this.activosRepository.findOne({
        where: { id: recurso.activoId, empresaId },
      });
      if (!activo) {
        throw new BadRequestException(`Activo ${recurso.activoId} no encontrado.`);
      }

      const tipo = await this.tiposActivosRepository.findOne({
        where: { id: activo.tipoActivoId, empresaId, estaActivo: true },
      });
      if (!tipo || !tipo.categoriaEquipoId) {
        throw new BadRequestException(
          `Tipo de activo ${activo.tipoActivoId} sin categoria activa.`,
        );
      }

      const categoria = await this.categoriasRepository.findOne({
        where: { id: tipo.categoriaEquipoId, empresaId, estaActiva: true },
      });
      if (!categoria) {
        throw new BadRequestException(
          `Categoria ${tipo.categoriaEquipoId} no encontrada o inactiva.`,
        );
      }

      return { categoriaId: categoria.id, dominioId: categoria.dominioId };
    }

    if (recurso.lineaTelefonicaId) {
      const telecomDomain = await this.dominiosRepository.findOne({
        where: { empresaId, codigo: 'telecom', estaActivo: true },
      });
      if (!telecomDomain) {
        throw new BadRequestException('Dominio telecom no disponible para política de formularios.');
      }
      return { dominioId: telecomDomain.id };
    }

    return {};
  }
}
