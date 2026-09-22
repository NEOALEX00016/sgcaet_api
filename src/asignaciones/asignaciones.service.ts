import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAsignacionDto } from './dto/create-asignacion.dto';
import { UpdateAsignacionDto } from './dto/update-asignacion.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Asignacion } from './entities/asignacione.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ActaAsignacion } from '../actas-asignacion/entities/acta-asignacion.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';
import { Activo } from '../activos/entities/activo.entity';

@Injectable()
export class AsignacionesService {
  private readonly transicionesValidas: Record<string, string[]> = {
    borrador: ['autorizada', 'cancelada'],
    autorizada: ['entregada', 'cancelada'],
    entregada: ['finalizada', 'cancelada'],
    rechazada: [],
    cancelada: [],
    finalizada: [],
  };

  constructor(
    @InjectRepository(Asignacion)
    private readonly asignacionesRepository: Repository<Asignacion>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
    @InjectRepository(ActaAsignacion)
    private readonly actasRepository: Repository<ActaAsignacion>,
    @InjectRepository(AsignacionRecurso)
    private readonly recursosRepository: Repository<AsignacionRecurso>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createAsignacionDto: CreateAsignacionDto,
    user: AuthenticatedUser,
  ): Promise<Asignacion> {
    return this.dataSource.transaction(async (manager) => {
      const asignacionesRepository = manager.getRepository(Asignacion);
      const usuariosRepository = manager.getRepository(Usuario);
      const bitacoraRepository = manager.getRepository(BitacoraAuditoriaSistema);
      const recursosRepository = manager.getRepository(AsignacionRecurso);
      const actasRepository = manager.getRepository(ActaAsignacion);

      await this.validarActor(user, usuariosRepository);
      this.validarReceptor(
        createAsignacionDto.personaId,
        createAsignacionDto.departamentoId,
        createAsignacionDto.ubicacionId,
      );

      const estado = createAsignacionDto.estado ?? 'borrador';
      this.validarEstadoFinalizacion(
        estado,
        createAsignacionDto.fechaAsignacion,
        undefined,
      );
      this.validarFechasAsignacion(
        createAsignacionDto.fechaAsignacion,
        createAsignacionDto.fechaPrevistaDevolucion,
      );

      const asignacion = asignacionesRepository.create({
        ...createAsignacionDto,
        empresaId: user.empresaId,
        fechaAsignacion: new Date(createAsignacionDto.fechaAsignacion),
        fechaPrevistaDevolucion: createAsignacionDto.fechaPrevistaDevolucion
          ? new Date(createAsignacionDto.fechaPrevistaDevolucion)
          : undefined,
        estado,
      });

      const saved = await asignacionesRepository.save(asignacion);

      await this.registrarBitacora(
        user,
        'ASIGNACIONES_CREAR',
        'asignaciones',
        saved.id,
        null,
        {
          estado: saved.estado,
          fechaAsignacion: saved.fechaAsignacion.toISOString(),
        },
        bitacoraRepository,
      );

      return saved;
    });
  }

  async findAll(user: AuthenticatedUser): Promise<Asignacion[]> {
    return this.asignacionesRepository.find({
      where: { empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<Asignacion> {
    const asignacion = await this.asignacionesRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!asignacion) {
      throw new NotFoundException(`Asignacion ${id} no encontrada`);
    }
    return asignacion;
  }

  async update(
    id: string,
    updateAsignacionDto: UpdateAsignacionDto,
    user: AuthenticatedUser,
  ): Promise<Asignacion> {
    return this.dataSource.transaction(async (manager) => {
      const asignacionesRepository = manager.getRepository(Asignacion);
      const usuariosRepository = manager.getRepository(Usuario);
      const bitacoraRepository = manager.getRepository(BitacoraAuditoriaSistema);
      const recursosRepository = manager.getRepository(AsignacionRecurso);
      const activosRepository = manager.getRepository(Activo);

      const actual = await asignacionesRepository.findOne({
        where: { id, empresaId: user.empresaId },
      });
      if (!actual) {
        throw new NotFoundException(`Asignacion ${id} no encontrada`);
      }

      await this.validarActor(user, usuariosRepository);
      this.validarReceptor(
        updateAsignacionDto.personaId ?? actual.personaId,
        updateAsignacionDto.departamentoId ?? actual.departamentoId,
        updateAsignacionDto.ubicacionId ?? actual.ubicacionId,
      );

      const estadoNuevo = updateAsignacionDto.estado ?? actual.estado;
      this.validarTransicionEstado(actual.estado, estadoNuevo);
      this.validarEstadoFinalizacion(
        estadoNuevo,
        updateAsignacionDto.fechaAsignacion ??
          actual.fechaAsignacion.toISOString(),
        updateAsignacionDto.fechaRealDevolucion,
      );
      this.validarFechasAsignacion(
        updateAsignacionDto.fechaAsignacion ??
          actual.fechaAsignacion.toISOString(),
        updateAsignacionDto.fechaPrevistaDevolucion ??
          actual.fechaPrevistaDevolucion?.toISOString(),
      );

      const payload = updateAsignacionDto;
      const merged = asignacionesRepository.merge(actual, {
        ...payload,
        fechaAsignacion: payload.fechaAsignacion
          ? new Date(payload.fechaAsignacion)
          : actual.fechaAsignacion,
        fechaPrevistaDevolucion: payload.fechaPrevistaDevolucion
          ? new Date(payload.fechaPrevistaDevolucion)
          : actual.fechaPrevistaDevolucion,
        fechaRealDevolucion: payload.fechaRealDevolucion
          ? new Date(payload.fechaRealDevolucion)
          : payload.estado === 'finalizada'
            ? new Date()
            : actual.fechaRealDevolucion,
        estado: estadoNuevo,
      });

      const saved = await asignacionesRepository.save(merged);

      if (estadoNuevo === 'cancelada') {
        const recursos = await recursosRepository.find({
          where: { empresaId: user.empresaId, asignacionId: saved.id, estaActivo: true },
        });
        if (recursos.length) {
          recursos.forEach((recurso) => { recurso.estaActivo = false });
          await recursosRepository.save(recursos);
          const activoIds = recursos.map((recurso) => recurso.activoId).filter(Boolean) as string[];
          if (activoIds.length) {
            const activos = await activosRepository.find({ where: { id: In(activoIds), empresaId: user.empresaId } });
            const liberados = activos.filter((activo) => activo.estado === 'asignado' || activo.estado === 'en_uso');
            liberados.forEach((activo) => { activo.estado = 'registrado' });
            if (liberados.length) await activosRepository.save(liberados);
          }
        }
      }

      await this.registrarBitacora(
        user,
        'ASIGNACIONES_ACTUALIZAR',
        'asignaciones',
        saved.id,
        {
          estado: actual.estado,
          fechaRealDevolucion: actual.fechaRealDevolucion?.toISOString() ?? null,
        },
        {
          estado: saved.estado,
          fechaRealDevolucion: saved.fechaRealDevolucion?.toISOString() ?? null,
        },
        bitacoraRepository,
      );

      return saved;
    });
  }

  async autorizar(id: string, user: AuthenticatedUser): Promise<Asignacion> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Asignacion);
      const actasRepository = manager.getRepository(ActaAsignacion);
      const usuariosRepository = manager.getRepository(Usuario);
      const bitacoraRepository = manager.getRepository(BitacoraAuditoriaSistema);
      const actual = await repository.findOne({ where: { id, empresaId: user.empresaId } });
      if (!actual) throw new NotFoundException(`Asignacion ${id} no encontrada`);
      await this.validarActor(user, usuariosRepository);
      const estadoAnterior = actual.estado;
      if (actual.estado !== 'borrador') throw new BadRequestException(`La asignación no puede autorizarse desde el estado ${actual.estado}.`);
      actual.estado = 'autorizada';
      const saved = await repository.save(actual);
      await this.registrarBitacora(user, 'ASIGNACIONES_AVANZAR_FLUJO', 'asignaciones', saved.id, { estado: estadoAnterior }, { estado: saved.estado }, bitacoraRepository);
      return saved;
    });
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const asignacionesRepository = manager.getRepository(Asignacion);
      const usuariosRepository = manager.getRepository(Usuario);
      const bitacoraRepository = manager.getRepository(BitacoraAuditoriaSistema);

      const actual = await asignacionesRepository.findOne({
        where: { id, empresaId: user.empresaId },
      });
      if (!actual) {
        throw new NotFoundException(`Asignacion ${id} no encontrada`);
      }

      if (!['borrador', 'cancelada'].includes(actual.estado)) {
        throw new BadRequestException('Solo se pueden eliminar asignaciones en borrador o canceladas.');
      }

      await this.validarActor(user, usuariosRepository);

      await asignacionesRepository.delete({ id, empresaId: user.empresaId });

      await this.registrarBitacora(
        user,
        'ASIGNACIONES_ELIMINAR',
        'asignaciones',
        actual.id,
        {
          estado: actual.estado,
        },
        null,
        bitacoraRepository,
      );
    });
  }

  async completarEntrega(id: string, user: AuthenticatedUser): Promise<Asignacion> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Asignacion);
      const actasRepository = manager.getRepository(ActaAsignacion);
      const asignacion = await repository.findOne({ where: { id, empresaId: user.empresaId } });
      if (!asignacion) throw new NotFoundException(`Asignacion ${id} no encontrada`);
      if (asignacion.estado !== 'autorizada') throw new BadRequestException('La asignación debe estar autorizada antes de completar la entrega.');
      const actas = await actasRepository.find({ where: { asignacionId: id, empresaId: user.empresaId } });
      if (!actas.length || actas.some((acta) => acta.estado !== 'firmada' || !acta.documentoId)) throw new BadRequestException('La entrega requiere todas las actas preparadas y firmadas con documento.');
      asignacion.estado = 'entregada';
      return repository.save(asignacion);
    });
  }

  private validarReceptor(
    personaId?: string,
    departamentoId?: string,
    ubicacionId?: string,
  ): void {
    if (!personaId && !departamentoId && !ubicacionId) {
      throw new BadRequestException(
        'La asignacion requiere persona, departamento o ubicacion objetivo',
      );
    }
  }

  private validarTransicionEstado(
    estadoActual: string,
    estadoNuevo: string,
  ): void {
    if (estadoActual === estadoNuevo) {
      return;
    }

    const permitidos = this.transicionesValidas[estadoActual] ?? [];
    if (!permitidos.includes(estadoNuevo)) {
      throw new BadRequestException(
        `Transicion invalida de estado: ${estadoActual} -> ${estadoNuevo}`,
      );
    }
  }

  private validarEstadoFinalizacion(
    estado: string,
    fechaAsignacion: string,
    fechaRealDevolucion?: string,
  ): void {
    if (estado !== 'finalizada') {
      return;
    }

    if (!fechaRealDevolucion) {
      return;
    }

    if (
      new Date(fechaRealDevolucion).getTime() <
      new Date(fechaAsignacion).getTime()
    ) {
      throw new BadRequestException(
        'La fecha real de devolucion no puede ser anterior a la fecha de asignacion',
      );
    }
  }

  private validarFechasAsignacion(
    fechaAsignacion: string,
    fechaPrevistaDevolucion?: string,
  ): void {
    if (!fechaPrevistaDevolucion) {
      return;
    }

    if (
      new Date(fechaPrevistaDevolucion).getTime() <
      new Date(fechaAsignacion).getTime()
    ) {
      throw new BadRequestException(
        'La fecha prevista de devolucion no puede ser anterior a la fecha de asignacion',
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
