import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CompletarFormularioReparacionDto } from './dto/create-formularios-reparacion.dto';
import { FormularioReparacion } from './entities/formularios-reparacion.entity';
import { ReparacionActivo } from '../reparaciones-activo/entities/reparaciones-activo.entity';
import { Activo } from '../activos/entities/activo.entity';
import { TiposActivo } from '../tipos-activo/entities/tipos-activo.entity';
import { FormularioVersione } from '../formulario-versiones/entities/formulario-versione.entity';
import { PoliticasFormularioTallerService } from '../politicas-formulario-taller/politicas-formulario-taller.service';
import { FormularioRespuestasService } from '../formulario-respuestas/formulario-respuestas.service';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { Persona } from '../personas/entities/persona.entity';
import { Departamento } from '../departamentos/entities/departamento.entity';
import { Ubicacione } from '../ubicaciones/entities/ubicacione.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AtributosDinamicosActivo } from '../atributos-dinamicos-activo/entities/atributos-dinamicos-activo.entity';
import { EspecificacionTipoActivo } from '../especificaciones-tipo-activo/entities/especificacion-tipo-activo.entity';

type InitialValue = string | number | boolean;

@Injectable()
export class FormulariosReparacionService {
  constructor(
    @InjectRepository(FormularioReparacion)
    private readonly repository: Repository<FormularioReparacion>,
    @InjectRepository(ReparacionActivo)
    private readonly reparacionesRepository: Repository<ReparacionActivo>,
    @InjectRepository(Activo)
    private readonly activosRepository: Repository<Activo>,
    @InjectRepository(TiposActivo)
    private readonly tiposRepository: Repository<TiposActivo>,
    @InjectRepository(FormularioVersione)
    private readonly versionesRepository: Repository<FormularioVersione>,
    @InjectRepository(Asignacion)
    private readonly asignacionesRepository: Repository<Asignacion>,
    @InjectRepository(Persona)
    private readonly personasRepository: Repository<Persona>,
    @InjectRepository(Departamento)
    private readonly departamentosRepository: Repository<Departamento>,
    @InjectRepository(Ubicacione)
    private readonly ubicacionesRepository: Repository<Ubicacione>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(AtributosDinamicosActivo)
    private readonly atributosRepository: Repository<AtributosDinamicosActivo>,
    @InjectRepository(EspecificacionTipoActivo)
    private readonly especificacionesRepository: Repository<EspecificacionTipoActivo>,
    private readonly policies: PoliticasFormularioTallerService,
    private readonly respuestas: FormularioRespuestasService,
    private readonly dataSource: DataSource,
  ) {}

  async prepare(reparacionId: string, etapa: string, user: AuthenticatedUser) {
    if (!['entrada', 'salida'].includes(etapa))
      throw new BadRequestException('Etapa de formulario invalida');
    const context = await this.context(reparacionId, user.empresaId);
    const existing = await this.repository.findOne({
      where: {
        reparacionActivoId: reparacionId,
        etapa,
        empresaId: user.empresaId,
      },
    });
    if (existing)
      return this.enrich(existing, context, user.empresaId, user.userId);
    if (['cerrada', 'cancelada'].includes(context.reparacion.estado))
      throw new BadRequestException(
        'La orden finalizada no admite nuevos formularios',
      );
    const policy = await this.policies.resolve(
      user.empresaId,
      context.reparacion.tipoServicio,
      etapa,
      context.activo.tipoActivoId,
      context.tipo.categoriaEquipoId,
    );
    if (!policy) {
      return {
        prepared: false,
        etapa,
        tipoServicio: context.reparacion.tipoServicio,
        reason: `No existe una política activa para ${context.reparacion.tipoServicio} / ${etapa}`,
      };
    }
    const version = await this.versionesRepository.findOne({
      where: {
        empresaId: user.empresaId,
        formularioId: policy.formularioId,
        estado: 'publicada',
      },
      order: { versionNumero: 'DESC' },
    });
    if (!version)
      throw new BadRequestException(
        'La politica efectiva no tiene una version publicada',
      );
    try {
      const saved = await this.repository.save(
        this.repository.create({
          empresaId: user.empresaId,
          reparacionActivoId: reparacionId,
          etapa,
          formularioVersionId: version.id,
          estado: 'pendiente',
        }),
      );
      return this.enrich(saved, context, user.empresaId, user.userId);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        const concurrent = await this.repository.findOneOrFail({
          where: {
            reparacionActivoId: reparacionId,
            etapa,
            empresaId: user.empresaId,
          },
        });
        return this.enrich(concurrent, context, user.empresaId, user.userId);
      }
      throw error;
    }
  }

  async findByRepair(reparacionId: string, user: AuthenticatedUser) {
    const context = await this.context(reparacionId, user.empresaId);
    const instances = await this.repository.find({
      where: { reparacionActivoId: reparacionId, empresaId: user.empresaId },
      order: { createdAt: 'ASC' },
    });
    if (!instances.length) return [];
    const valoresIniciales = await this.initialValues(
      context,
      user.empresaId,
      user.userId,
    );
    return instances.map((instance) => ({ ...instance, valoresIniciales }));
  }

  async complete(
    reparacionId: string,
    instanciaId: string,
    dto: CompletarFormularioReparacionDto,
    user: AuthenticatedUser,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const instances = manager.getRepository(FormularioReparacion);
      const instance = await instances.findOne({
        where: {
          id: instanciaId,
          reparacionActivoId: reparacionId,
          empresaId: user.empresaId,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!instance)
        throw new NotFoundException(
          'Instancia de formulario no encontrada para la orden',
        );
      if (instance.estado === 'completado')
        throw new BadRequestException('El formulario completado es inmutable');
      const context = await this.context(reparacionId, user.empresaId, manager);
      if (['cerrada', 'cancelada'].includes(context.reparacion.estado))
        throw new BadRequestException(
          'La orden finalizada no admite respuestas',
        );
      const response = await this.respuestas.createFromFrozenVersion(
        {
          detalles: dto.detalles,
          evidenciaIds: dto.evidenciaIds,
          formularioVersionId: instance.formularioVersionId,
          entidadRelacionada: 'formularios_reparacion',
          entidadRelacionadaId: instance.id,
        },
        user,
        manager,
      );
      instance.formularioRespuestaId = response.id;
      instance.estado = 'completado';
      return instances.save(instance);
    });
  }

  async assertRequiredComplete(
    reparacion: ReparacionActivo,
    etapa: string,
    empresaId: string,
    manager?: EntityManager,
  ) {
    const context = await this.context(reparacion.id, empresaId, manager);
    const policy = await this.policies.resolve(
      empresaId,
      reparacion.tipoServicio,
      etapa,
      context.activo.tipoActivoId,
      context.tipo.categoriaEquipoId,
    );
    if (!policy?.esObligatoria) return;
    const repository =
      manager?.getRepository(FormularioReparacion) ?? this.repository;
    const instance = await repository.findOne({
      where: { reparacionActivoId: reparacion.id, etapa, empresaId },
    });
    if (!instance || instance.estado !== 'completado')
      throw new BadRequestException(
        `Debe completar el formulario obligatorio de ${etapa}`,
      );
  }

  private async context(
    reparacionId: string,
    empresaId: string,
    manager?: EntityManager,
  ) {
    const repairs =
      manager?.getRepository(ReparacionActivo) ?? this.reparacionesRepository;
    const assets = manager?.getRepository(Activo) ?? this.activosRepository;
    const types = manager?.getRepository(TiposActivo) ?? this.tiposRepository;
    const reparacion = await repairs.findOne({
      where: { id: reparacionId, empresaId },
    });
    if (!reparacion) throw new NotFoundException('Reparacion no encontrada');
    const activo = await assets.findOne({
      where: { id: reparacion.activoId, empresaId },
    });
    if (!activo)
      throw new BadRequestException(
        'El activo de la orden no pertenece a la empresa',
      );
    const tipo = await types.findOne({
      where: { id: activo.tipoActivoId, empresaId },
    });
    if (!tipo)
      throw new BadRequestException(
        'El tipo del activo no pertenece a la empresa',
      );
    return { reparacion, activo, tipo };
  }

  private async enrich(
    instance: FormularioReparacion,
    context: Awaited<ReturnType<FormulariosReparacionService['context']>>,
    empresaId: string,
    actorId: string,
  ) {
    return {
      ...instance,
      valoresIniciales: await this.initialValues(context, empresaId, actorId),
    };
  }

  private async initialValues(
    context: Awaited<ReturnType<FormulariosReparacionService['context']>>,
    empresaId: string,
    actorId: string,
  ): Promise<Record<string, InitialValue>> {
    const { reparacion, activo, tipo } = context;
    const assignment = reparacion.asignacionId
      ? await this.asignacionesRepository.findOne({
          where: { id: reparacion.asignacionId, empresaId },
        })
      : null;
    const [person, department, location, actor, attributes, definitions] =
      await Promise.all([
        assignment?.personaId
          ? this.personasRepository.findOne({
              where: { id: assignment.personaId, empresaId },
            })
          : null,
        assignment?.departamentoId
          ? this.departamentosRepository.findOne({
              where: { id: assignment.departamentoId, empresaId },
            })
          : null,
        assignment?.ubicacionId || activo.ubicacionActualId
          ? this.ubicacionesRepository.findOne({
              where: {
                id: assignment?.ubicacionId ?? activo.ubicacionActualId,
                empresaId,
              },
            })
          : null,
        this.usuariosRepository.findOne({
          where: {
            id: assignment?.entregadoPor ?? reparacion.creadoPor ?? actorId,
            empresaId,
          },
        }),
        this.atributosRepository.find({
          where: { activoId: activo.id, empresaId },
        }),
        this.especificacionesRepository.find({
          where: [
            { empresaId, tipoActivoId: tipo.id },
            ...(tipo.categoriaEquipoId
              ? [{ empresaId, categoriaEquipoId: tipo.categoriaEquipoId }]
              : []),
          ],
        }),
      ]);

    const values: Record<string, InitialValue> = {};
    for (const definition of definitions) values[definition.clave] = '';
    for (const attribute of attributes) {
      values[attribute.clave] = this.attributeValue(attribute);
    }

    const personName = person
      ? `${person.nombres} ${person.apellidos}`.trim()
      : '';
    const actorName = actor
      ? `${actor.nombres} ${actor.apellidos}`.trim()
      : '';
    const capacities = attributes
      .map((attribute) => {
        const definition = definitions.find(
          (item) => item.clave === attribute.clave,
        );
        const value = this.attributeValue(attribute);
        if (value === '') return '';
        return `${definition?.nombre ?? attribute.clave}: ${String(value)}${attribute.unidad ? ` ${attribute.unidad}` : ''}`;
      })
      .filter(Boolean)
      .join(', ');
    const date = (value?: Date | string) =>
      value ? new Date(value).toISOString().slice(0, 10) : '';

    Object.assign(values, {
      fecha_entrega: date(assignment?.fechaAsignacion),
      direccion: location?.direccion ?? location?.nombre ?? department?.nombre ?? '',
      usuario_nombre: personName,
      tipo_equipo: tipo.nombre ?? '',
      descripcion_equipo: activo.nombre ?? '',
      marca_modelo: [activo.marca, activo.modelo].filter(Boolean).join(' / '),
      numero_inventario: activo.codigoActivo ?? '',
      numero_serie: activo.serial ?? '',
      capacidades_equipo: capacities,
      accesorios: '',
      nota: assignment?.observaciones ?? '',
      entregado_por: actorName,
      recibido_por: personName,
      firma_entrega: '',
      firma_recibe: '',
      fecha_entrada: date(reparacion.fechaIngreso),
      fecha_salida: date(reparacion.fechaSalida),
      falla_reportada: reparacion.diagnostico ?? '',
      motivo_reparacion: assignment?.motivo ?? '',
      diagnostico: reparacion.diagnostico ?? '',
      solucion_aplicada: reparacion.resolucion ?? '',
      resolucion: reparacion.resolucion ?? '',
      proveedor_tecnico: reparacion.proveedorTecnico ?? '',
      costo: reparacion.costo == null ? '' : Number(reparacion.costo),
      moneda: reparacion.moneda ?? '',
      estado_equipo: activo.estado ?? '',
      tipo_servicio: reparacion.tipoServicio ?? '',
      responsable_actual: personName,
      observaciones: reparacion.observaciones ?? '',
    });
    return values;
  }

  private attributeValue(attribute: AtributosDinamicosActivo): InitialValue {
    if (attribute.valorTexto != null) return attribute.valorTexto;
    if (attribute.valorNumero != null) {
      const value = Number(attribute.valorNumero);
      return Number.isFinite(value) ? value : '';
    }
    if (attribute.valorFecha != null) return attribute.valorFecha;
    if (attribute.valorBooleano != null) return attribute.valorBooleano;
    return '';
  }
}
