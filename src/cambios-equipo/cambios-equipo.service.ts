import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCambioEquipoDto } from './dto/create-cambio-equipo.dto';
import { UpdateCambioEquipoDto } from './dto/update-cambio-equipo.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { CambioEquipo } from './entities/cambios-equipo.entity';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';
import { Activo } from '../activos/entities/activo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { DocumentEntity } from '../documents/entities/document.entity';

@Injectable()
export class CambiosEquipoService {
  constructor(
    @InjectRepository(CambioEquipo)
    private readonly cambiosEquipoRepository: Repository<CambioEquipo>,
    @InjectRepository(Asignacion)
    private readonly asignacionesRepository: Repository<Asignacion>,
    @InjectRepository(AsignacionRecurso)
    private readonly asignacionRecursosRepository: Repository<AsignacionRecurso>,
    @InjectRepository(Activo)
    private readonly activosRepository: Repository<Activo>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
    @InjectRepository(DocumentEntity)
    private readonly documentsRepository: Repository<DocumentEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createCambioEquipoDto: CreateCambioEquipoDto,
    user: AuthenticatedUser,
  ): Promise<CambioEquipo> {
    return this.dataSource.transaction(async (manager) => {
      const cambiosEquipoRepository = manager.getRepository(CambioEquipo);
      const asignacionesRepository = manager.getRepository(Asignacion);
      const asignacionRecursosRepository = manager.getRepository(AsignacionRecurso);
      const activosRepository = manager.getRepository(Activo);
      const usuariosRepository = manager.getRepository(Usuario);
      const bitacoraRepository = manager.getRepository(BitacoraAuditoriaSistema);
      const documentsRepository = manager.getRepository(DocumentEntity);

      await this.validarActor(user, usuariosRepository);
      await this.validarAsignacion(
        createCambioEquipoDto.asignacionId,
        user.empresaId,
        asignacionesRepository,
      );

      if (
        createCambioEquipoDto.activoAnteriorId ===
        createCambioEquipoDto.activoNuevoId
      ) {
        throw new BadRequestException(
          'El activo anterior y el nuevo no pueden ser iguales',
        );
      }

      const existente = await cambiosEquipoRepository.findOne({
        where: {
          empresaId: user.empresaId,
          asignacionId: createCambioEquipoDto.asignacionId,
          activoAnteriorId: createCambioEquipoDto.activoAnteriorId,
          activoNuevoId: createCambioEquipoDto.activoNuevoId,
        },
      });
      if (existente) {
        return existente;
      }

      await this.validarActivo(
        createCambioEquipoDto.activoAnteriorId,
        user.empresaId,
        activosRepository,
      );
      await this.validarActivo(
        createCambioEquipoDto.activoNuevoId,
        user.empresaId,
        activosRepository,
      );

      const recursoAnterior = await asignacionRecursosRepository.findOne({
        where: {
          empresaId: user.empresaId,
          asignacionId: createCambioEquipoDto.asignacionId,
          tipoRecurso: 'activo',
          activoId: createCambioEquipoDto.activoAnteriorId,
          estaActivo: true,
        },
      });

      if (!recursoAnterior) {
        throw new BadRequestException(
          'La asignacion no tiene activo anterior activo para reemplazar',
        );
      }

      const recursoNuevoActivo = await asignacionRecursosRepository.findOne({
        where: {
          activoId: createCambioEquipoDto.activoNuevoId,
          empresaId: user.empresaId,
          estaActivo: true,
        },
      });

      if (recursoNuevoActivo) {
        throw new BadRequestException(
          'El activo nuevo ya se encuentra asignado de forma activa',
        );
      }

      const cambio = cambiosEquipoRepository.create({
        ...createCambioEquipoDto,
        empresaId: user.empresaId,
        ejecutadoEn: createCambioEquipoDto.ejecutadoEn
          ? new Date(createCambioEquipoDto.ejecutadoEn)
          : new Date(),
        documentoId: createCambioEquipoDto.documentoId,
        estado: 'pendiente_documento',
      });

       let saved: CambioEquipo;
       try {
         saved = await cambiosEquipoRepository.save(cambio);
       } catch (error) {
         if (error instanceof QueryFailedError && (error as QueryFailedError & { driverError?: { code?: string } }).driverError?.code === '23505') {
           throw new BadRequestException('Ya existe un cambio de equipo para esta asignación y estos equipos.');
         }
         throw error;
       }

       if (saved.documentoId) await this.validarDocumentoFirmado(saved.documentoId, saved.id, user.empresaId, documentsRepository);

      await this.registrarBitacora(
        user,
        'CAMBIOS_EQUIPO_CREAR',
        'cambios_equipo',
        saved.id,
        {
          activoAnteriorId: createCambioEquipoDto.activoAnteriorId,
        },
        {
          activoNuevoId: createCambioEquipoDto.activoNuevoId,
          asignacionId: createCambioEquipoDto.asignacionId,
        },
        bitacoraRepository,
      );

      return saved;
    });
  }

  async confirmar(id: string, documentoId: string, user: AuthenticatedUser): Promise<CambioEquipo> {
    return this.dataSource.transaction(async (manager) => {
      const cambios = manager.getRepository(CambioEquipo);
      const recursos = manager.getRepository(AsignacionRecurso);
      const activos = manager.getRepository(Activo);
      const documentos = manager.getRepository(DocumentEntity);
      const actual = await cambios.findOne({ where: { id, empresaId: user.empresaId } });
      if (!actual) throw new NotFoundException(`Cambio de equipo ${id} no encontrado`);
      await this.validarDocumentoFirmado(documentoId, id, user.empresaId, documentos);
      const anterior = await recursos.findOne({ where: { empresaId: user.empresaId, asignacionId: actual.asignacionId, activoId: actual.activoAnteriorId, estaActivo: true } });
      if (!anterior) throw new BadRequestException('El activo anterior ya no esta activo en la asignacion');
      anterior.estaActivo = false;
      await recursos.save(anterior);
      await recursos.save(recursos.create({ empresaId: user.empresaId, asignacionId: actual.asignacionId, tipoRecurso: 'activo', activoId: actual.activoNuevoId, estaActivo: true }));
      const [activoAnterior, activoNuevo] = await Promise.all([
        activos.findOne({ where: { id: actual.activoAnteriorId, empresaId: user.empresaId } }),
        activos.findOne({ where: { id: actual.activoNuevoId, empresaId: user.empresaId } }),
      ]);
      if (activoAnterior && (activoAnterior.estado === 'asignado' || activoAnterior.estado === 'en_uso')) {
        activoAnterior.estado = 'registrado';
        await activos.save(activoAnterior);
      }
      if (activoNuevo && !['en_reparacion', 'perdido', 'robado', 'dado_de_baja', 'desechado'].includes(activoNuevo.estado)) {
        activoNuevo.estado = 'asignado';
        await activos.save(activoNuevo);
      }
      actual.documentoId = documentoId;
      actual.estado = 'completada';
      return cambios.save(actual);
    });
  }

  private async validarDocumentoFirmado(documentoId: string, operationId: string, empresaId: string, repository: Repository<DocumentEntity>) {
    const document = await repository.findOne({ where: { id: documentoId, empresaId } });
    if (!document || document.entidadRelacionada !== 'cambios_equipo' || document.entidadRelacionadaId !== operationId) {
      throw new BadRequestException('El cambio de equipo requiere un acta firmada vinculada a la operacion');
    }
  }

  async findAll(user: AuthenticatedUser): Promise<CambioEquipo[]> {
    return this.cambiosEquipoRepository.find({
      where: { empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<CambioEquipo> {
    const cambio = await this.cambiosEquipoRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!cambio) {
      throw new NotFoundException(`Cambio de equipo ${id} no encontrado`);
    }

    return cambio;
  }

  async update(
    id: string,
    updateCambioEquipoDto: UpdateCambioEquipoDto,
    user: AuthenticatedUser,
  ): Promise<CambioEquipo> {
    return this.dataSource.transaction(async (manager) => {
      const cambiosEquipoRepository = manager.getRepository(CambioEquipo);
      const usuariosRepository = manager.getRepository(Usuario);
      const bitacoraRepository = manager.getRepository(BitacoraAuditoriaSistema);

      const actual = await cambiosEquipoRepository.findOne({
        where: { id, empresaId: user.empresaId },
      });
      if (!actual) {
        throw new NotFoundException(`Cambio de equipo ${id} no encontrado`);
      }
      await this.validarActor(user, usuariosRepository);

      const payload = updateCambioEquipoDto;
      const merged = cambiosEquipoRepository.merge(actual, {
        ...payload,
        ejecutadoEn: payload.ejecutadoEn
          ? new Date(payload.ejecutadoEn)
          : actual.ejecutadoEn,
      });
      const saved = await cambiosEquipoRepository.save(merged);

      await this.registrarBitacora(
        user,
        'CAMBIOS_EQUIPO_ACTUALIZAR',
        'cambios_equipo',
        saved.id,
        {
          motivo: actual.motivo,
          autorizadoPor: actual.autorizadoPor ?? null,
        },
        {
          motivo: saved.motivo,
          autorizadoPor: saved.autorizadoPor ?? null,
        },
        bitacoraRepository,
      );

      return saved;
    });
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const cambiosEquipoRepository = manager.getRepository(CambioEquipo);
      const usuariosRepository = manager.getRepository(Usuario);
      const bitacoraRepository = manager.getRepository(BitacoraAuditoriaSistema);

      const actual = await cambiosEquipoRepository.findOne({
        where: { id, empresaId: user.empresaId },
      });
      if (!actual) {
        throw new NotFoundException(`Cambio de equipo ${id} no encontrado`);
      }
      await this.validarActor(user, usuariosRepository);

      await cambiosEquipoRepository.delete({
        id,
        empresaId: user.empresaId,
      });

      await this.registrarBitacora(
        user,
        'CAMBIOS_EQUIPO_ELIMINAR',
        'cambios_equipo',
        actual.id,
        {
          activoAnteriorId: actual.activoAnteriorId,
          activoNuevoId: actual.activoNuevoId,
        },
        null,
        bitacoraRepository,
      );
    });
  }

  private async validarAsignacion(
    asignacionId: string,
    empresaId: string,
    asignacionesRepository: Repository<Asignacion> = this.asignacionesRepository,
  ): Promise<void> {
    const asignacion = await asignacionesRepository.findOne({
      where: {
        id: asignacionId,
        empresaId,
      },
    });

    if (!asignacion) {
      throw new NotFoundException(
        'Asignacion no encontrada para la empresa indicada',
      );
    }
  }

  private async validarActivo(
    activoId: string,
    empresaId: string,
    activosRepository: Repository<Activo> = this.activosRepository,
  ): Promise<void> {
    const activo = await activosRepository.findOne({
      where: {
        id: activoId,
        empresaId,
        deletedAt: IsNull(),
      },
    });

    if (!activo) {
      throw new NotFoundException(
        'Activo no encontrado para la empresa indicada',
      );
    }
  }

  private async validarActor(
    user: AuthenticatedUser,
    usuariosRepository: Repository<Usuario> = this.usuariosRepository,
  ): Promise<void> {
    const actor = await usuariosRepository.findOne({
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
    bitacoraRepository: Repository<BitacoraAuditoriaSistema> =
      this.bitacoraRepository,
  ): Promise<void> {
    const registro = bitacoraRepository.create({
      empresaId: user.empresaId,
      usuarioActorId: user.userId,
      accion,
      entidad,
      entidadId,
      valoresAnteriores: valoresAnteriores ?? undefined,
      valoresNuevos: valoresNuevos ?? undefined,
      resultado: 'exito',
    });

    await bitacoraRepository.save(registro);
  }
}
