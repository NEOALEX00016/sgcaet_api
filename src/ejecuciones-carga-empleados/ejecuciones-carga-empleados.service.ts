import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreateEjecucionesCargaEmpleadoDto } from './dto/create-ejecuciones-carga-empleado.dto';
import { UpdateEjecucionesCargaEmpleadoDto } from './dto/update-ejecuciones-carga-empleado.dto';
import { EjecucionesCargaEmpleado } from './entities/ejecuciones-carga-empleado.entity';
import { FuentesEmpleado } from '../fuentes-empleados/entities/fuentes-empleado.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
@Injectable()
export class EjecucionesCargaEmpleadosService {
  constructor(
    @InjectRepository(EjecucionesCargaEmpleado)
    private readonly repo: Repository<EjecucionesCargaEmpleado>,
    @InjectRepository(FuentesEmpleado)
    private readonly fuentes: Repository<FuentesEmpleado>,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacora: Repository<BitacoraAuditoriaSistema>,
  ) {}
  async create(
    dto: CreateEjecucionesCargaEmpleadoDto,
    user: AuthenticatedUser,
  ) {
    await this.actor(user);
    if (
      dto.fuenteEmpleadosId &&
      !(await this.fuentes.findOne({
        where: { id: dto.fuenteEmpleadosId, empresaId: user.empresaId },
      }))
    )
      throw new NotFoundException('Fuente no encontrada para la empresa');
    const item = await this.repo.save(
      this.repo.create({
        ...dto,
        empresaId: user.empresaId,
        creadaPor: user.userId,
        finalizadaEn: dto.finalizadaEn ? new Date(dto.finalizadaEn) : undefined,
      }),
    );
    await this.log(user, 'EJECUCIONES_CARGA_CREAR', item.id);
    return item;
  }
  findAll(empresaId: string) {
    return this.repo.find({
      where: { empresaId },
      order: { iniciadaEn: 'DESC' },
    });
  }
  async findOne(id: string, empresaId: string) {
    const item = await this.repo.findOne({ where: { id, empresaId } });
    if (!item) throw new NotFoundException('Ejecucion de carga no encontrada');
    return item;
  }
  async update(
    id: string,
    dto: UpdateEjecucionesCargaEmpleadoDto,
    user: AuthenticatedUser,
  ) {
    const item = await this.findOne(id, user.empresaId);
    await this.actor(user);
    const saved = await this.repo.save(
      this.repo.merge(item, {
        ...dto,
        finalizadaEn: dto.finalizadaEn
          ? new Date(dto.finalizadaEn)
          : item.finalizadaEn,
      }),
    );
    await this.log(user, 'EJECUCIONES_CARGA_ACTUALIZAR', id);
    return saved;
  }
  async remove(id: string, user: AuthenticatedUser) {
    const item = await this.findOne(id, user.empresaId);
    await this.actor(user);
    item.estado = 'cancelada';
    item.finalizadaEn = new Date();
    const saved = await this.repo.save(item);
    await this.log(user, 'EJECUCIONES_CARGA_CANCELAR', id);
    return saved;
  }
  private async actor(user: AuthenticatedUser) {
    if (
      !(await this.usuarios.findOne({
        where: {
          id: user.userId,
          empresaId: user.empresaId,
          estado: 'activo',
          deletedAt: IsNull(),
        },
      }))
    )
      throw new NotFoundException('Actor no disponible');
  }
  private async log(user: AuthenticatedUser, accion: string, id: string) {
    await this.bitacora.save(
      this.bitacora.create({
        empresaId: user.empresaId,
        usuarioActorId: user.userId,
        accion,
        entidad: 'ejecuciones_carga_empleados',
        entidadId: id,
        resultado: 'exito',
      }),
    );
  }
}
