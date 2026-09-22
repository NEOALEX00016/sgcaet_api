import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateDevolucionDto } from './dto/create-devolucion.dto';
import { UpdateDevolucionDto } from './dto/update-devolucion.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Devolucion } from './entities/devolucione.entity';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { DocumentEntity } from '../documents/entities/document.entity';
import { Activo } from '../activos/entities/activo.entity';

@Injectable()
export class DevolucionesService {
  constructor(
    @InjectRepository(Devolucion)
    private readonly devolucionesRepository: Repository<Devolucion>,
    @InjectRepository(Asignacion)
    private readonly asignacionesRepository: Repository<Asignacion>,
    @InjectRepository(AsignacionRecurso)
    private readonly asignacionRecursosRepository: Repository<AsignacionRecurso>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
    @InjectRepository(DocumentEntity)
    private readonly documentsRepository: Repository<DocumentEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createDevolucionDto: CreateDevolucionDto,
    user: AuthenticatedUser,
  ): Promise<Devolucion> {
    return this.dataSource.transaction(async (manager) => {
      const devolucionesRepository = manager.getRepository(Devolucion);
      const asignacionesRepository = manager.getRepository(Asignacion);
      const asignacionRecursosRepository = manager.getRepository(AsignacionRecurso);
      const usuariosRepository = manager.getRepository(Usuario);
      const bitacoraRepository = manager.getRepository(BitacoraAuditoriaSistema);
      const documentsRepository = manager.getRepository(DocumentEntity);

      await this.validarActor(user, usuariosRepository);

      const asignacion = await asignacionesRepository.findOne({
        where: {
          id: createDevolucionDto.asignacionId,
          empresaId: user.empresaId,
        },
      });

      if (!asignacion) {
        throw new NotFoundException(
          'Asignacion no encontrada para la empresa indicada',
        );
      }

      if (asignacion.estado !== 'entregada') {
        throw new BadRequestException(
          'Solo se puede registrar devolucion para asignaciones en estado entregada',
        );
      }

      const existente = await devolucionesRepository.findOne({
        where: {
          asignacionId: createDevolucionDto.asignacionId,
          empresaId: user.empresaId,
        },
      });

      if (existente) {
        throw new BadRequestException(
          'La asignacion ya tiene una devolucion registrada',
        );
      }

      const devolucion = devolucionesRepository.create({
        ...createDevolucionDto,
        empresaId: user.empresaId,
        recibidoEn: createDevolucionDto.recibidoEn
          ? new Date(createDevolucionDto.recibidoEn)
          : new Date(),
        documentoId: createDevolucionDto.documentoId,
        estado: createDevolucionDto.documentoId ? 'firmada' : 'pendiente_documento',
      });

      const saved = await devolucionesRepository.save(devolucion);

       if (saved.documentoId) {
         await this.validarDocumentoFirmado(saved.documentoId, saved.id, user.empresaId, documentsRepository);
       }

      await this.registrarBitacora(
        user,
        'DEVOLUCIONES_CREAR',
        'devoluciones',
        saved.id,
        null,
        {
          asignacionId: saved.asignacionId,
          condicionActivo: saved.condicionActivo,
          recibidoEn: saved.recibidoEn.toISOString(),
        },
        bitacoraRepository,
      );

      return saved;
    });
  }

  async confirmar(id: string, documentoId: string, user: AuthenticatedUser): Promise<Devolucion> {
    return this.dataSource.transaction(async (manager) => {
      const devolucionesRepository = manager.getRepository(Devolucion);
      const asignacionesRepository = manager.getRepository(Asignacion);
      const recursosRepository = manager.getRepository(AsignacionRecurso);
      const activosRepository = manager.getRepository(Activo);
      const documentsRepository = manager.getRepository(DocumentEntity);
      const actual = await devolucionesRepository.findOne({ where: { id, empresaId: user.empresaId } });
      if (!actual) throw new NotFoundException(`Devolucion ${id} no encontrada`);
      await this.validarDocumentoFirmado(documentoId, id, user.empresaId, documentsRepository);
      actual.documentoId = documentoId;
      actual.estado = 'completada';
      const saved = await devolucionesRepository.save(actual);
      const asignacion = await asignacionesRepository.findOne({ where: { id: actual.asignacionId, empresaId: user.empresaId } });
      if (asignacion) {
        asignacion.estado = 'finalizada';
        asignacion.fechaRealDevolucion = saved.recibidoEn;
        await asignacionesRepository.save(asignacion);
        const activoIds = await this.desactivarRecursosAsignacion(asignacion.id, user.empresaId, recursosRepository);
        if (activoIds.length) {
          const activos = await activosRepository.find({ where: { id: In(activoIds), empresaId: user.empresaId } });
          const liberados = activos.filter((activo) => activo.estado === 'asignado' || activo.estado === 'en_uso');
          liberados.forEach((activo) => { activo.estado = 'registrado' });
          if (liberados.length) await activosRepository.save(liberados);
        }
      }
      return saved;
    });
  }

  private async validarDocumentoFirmado(documentoId: string, operationId: string, empresaId: string, repository: Repository<DocumentEntity>) {
    const document = await repository.findOne({ where: { id: documentoId, empresaId } });
    if (!document || document.entidadRelacionada !== 'devoluciones' || document.entidadRelacionadaId !== operationId) {
      throw new BadRequestException('La devolucion requiere un recibo firmado vinculado a la operacion');
    }
  }

  async findAll(user: AuthenticatedUser): Promise<Devolucion[]> {
    return this.devolucionesRepository.find({
      where: { empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<Devolucion> {
    const devolucion = await this.devolucionesRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!devolucion) {
      throw new NotFoundException(`Devolucion ${id} no encontrada`);
    }
    return devolucion;
  }

  async update(
    id: string,
    updateDevolucionDto: UpdateDevolucionDto,
    user: AuthenticatedUser,
  ): Promise<Devolucion> {
    return this.dataSource.transaction(async (manager) => {
      const devolucionesRepository = manager.getRepository(Devolucion);
      const usuariosRepository = manager.getRepository(Usuario);
      const bitacoraRepository = manager.getRepository(BitacoraAuditoriaSistema);

      const actual = await devolucionesRepository.findOne({
        where: { id, empresaId: user.empresaId },
      });
      if (!actual) {
        throw new NotFoundException(`Devolucion ${id} no encontrada`);
      }
      await this.validarActor(user, usuariosRepository);

      const payload = updateDevolucionDto;
      const merged = devolucionesRepository.merge(actual, {
        ...payload,
        recibidoEn: payload.recibidoEn
          ? new Date(payload.recibidoEn)
          : actual.recibidoEn,
      });
      const saved = await devolucionesRepository.save(merged);

      await this.registrarBitacora(
        user,
        'DEVOLUCIONES_ACTUALIZAR',
        'devoluciones',
        saved.id,
        {
          condicionActivo: actual.condicionActivo,
          recibidoEn: actual.recibidoEn.toISOString(),
        },
        {
          condicionActivo: saved.condicionActivo,
          recibidoEn: saved.recibidoEn.toISOString(),
        },
        bitacoraRepository,
      );

      return saved;
    });
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const devolucionesRepository = manager.getRepository(Devolucion);
      const usuariosRepository = manager.getRepository(Usuario);
      const bitacoraRepository = manager.getRepository(BitacoraAuditoriaSistema);

      const actual = await devolucionesRepository.findOne({
        where: { id, empresaId: user.empresaId },
      });
      if (!actual) {
        throw new NotFoundException(`Devolucion ${id} no encontrada`);
      }
      await this.validarActor(user, usuariosRepository);

      await devolucionesRepository.delete({ id, empresaId: user.empresaId });

      await this.registrarBitacora(
        user,
        'DEVOLUCIONES_ELIMINAR',
        'devoluciones',
        actual.id,
        {
          condicionActivo: actual.condicionActivo,
          recibidoEn: actual.recibidoEn.toISOString(),
        },
        null,
        bitacoraRepository,
      );
    });
  }

  private async desactivarRecursosAsignacion(
    asignacionId: string,
    empresaId: string,
    asignacionRecursosRepository: Repository<AsignacionRecurso> =
      this.asignacionRecursosRepository,
  ): Promise<string[]> {
    const recursos = await asignacionRecursosRepository.find({
      where: {
        asignacionId,
        empresaId,
        estaActivo: true,
      },
    });

    for (const recurso of recursos) {
      recurso.estaActivo = false;
      await asignacionRecursosRepository.save(recurso);
    }
    return recursos.map((recurso) => recurso.activoId).filter(Boolean) as string[];
  }

  private async validarActor(
    user: AuthenticatedUser,
    usuariosRepository: Repository<Usuario> = this.usuariosRepository,
  ): Promise<void> {
    const actor = await usuariosRepository.findOne({
      where: {
        id: user.userId,
        empresaId: user.empresaId,
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
