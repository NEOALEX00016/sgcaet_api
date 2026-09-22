import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreateEventosPersonaLaboralDto } from './dto/create-eventos-persona-laboral.dto';
import { UpdateEventosPersonaLaboralDto } from './dto/update-eventos-persona-laboral.dto';
import { EventosPersonaLaboral } from './entities/eventos-persona-laboral.entity';
import { Persona } from '../personas/entities/persona.entity';
import { FuentesEmpleado } from '../fuentes-empleados/entities/fuentes-empleado.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
@Injectable()
export class EventosPersonaLaboralService {
  constructor(
    @InjectRepository(EventosPersonaLaboral)
    private readonly repo: Repository<EventosPersonaLaboral>,
    @InjectRepository(Persona) private readonly personas: Repository<Persona>,
    @InjectRepository(FuentesEmpleado)
    private readonly fuentes: Repository<FuentesEmpleado>,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacora: Repository<BitacoraAuditoriaSistema>,
  ) {}
  async create(dto: CreateEventosPersonaLaboralDto, user: AuthenticatedUser) {
    const dtoNormalizado = this.normalizarDto(dto);
    this.validarConsistenciaEvento(dtoNormalizado);
    await this.actor(user);
    await this.fks(dtoNormalizado, user.empresaId);
    const item = await this.repo.save(
      this.repo.create({
        ...dtoNormalizado,
        empresaId: user.empresaId,
        detectadoEn: dtoNormalizado.detectadoEn
          ? new Date(dtoNormalizado.detectadoEn)
          : undefined,
      }),
    );
    await this.log(user, 'EVENTOS_PERSONA_LABORAL_CREAR', item.id);
    return item;
  }
  findAll(empresaId: string) {
    return this.repo.find({
      where: { empresaId },
      order: { detectadoEn: 'DESC' },
    });
  }
  async findOne(id: string, empresaId: string) {
    const item = await this.repo.findOne({ where: { id, empresaId } });
    if (!item) throw new NotFoundException('Evento laboral no encontrado');
    return item;
  }
  async update(
    id: string,
    dto: UpdateEventosPersonaLaboralDto,
    user: AuthenticatedUser,
  ) {
    const item = await this.findOne(id, user.empresaId);
    const dtoNormalizado = this.normalizarDto(dto);
    this.validarConsistenciaEvento({
      ...dtoNormalizado,
      personaId: dtoNormalizado.personaId ?? item.personaId,
      fuenteEmpleadosId: dtoNormalizado.fuenteEmpleadosId ?? item.fuenteEmpleadosId,
      tipoEvento: dtoNormalizado.tipoEvento ?? item.tipoEvento,
      estadoAnterior: dtoNormalizado.estadoAnterior ?? item.estadoAnterior,
      estadoNuevo: dtoNormalizado.estadoNuevo ?? item.estadoNuevo,
    });
    await this.actor(user);
    await this.fks(
      {
        personaId: dtoNormalizado.personaId ?? item.personaId,
        fuenteEmpleadosId: dtoNormalizado.fuenteEmpleadosId ?? item.fuenteEmpleadosId,
        tipoEvento: dtoNormalizado.tipoEvento ?? item.tipoEvento,
        estadoNuevo: dtoNormalizado.estadoNuevo ?? item.estadoNuevo,
      },
      user.empresaId,
    );
    const saved = await this.repo.save(
      this.repo.merge(item, {
        ...dtoNormalizado,
        detectadoEn: dtoNormalizado.detectadoEn
          ? new Date(dtoNormalizado.detectadoEn)
          : item.detectadoEn,
      }),
    );
    await this.log(user, 'EVENTOS_PERSONA_LABORAL_ACTUALIZAR', id);
    return saved;
  }
  async remove(id: string, user: AuthenticatedUser) {
    const item = await this.findOne(id, user.empresaId);
    await this.actor(user);
    await this.repo.remove(item);
    await this.log(user, 'EVENTOS_PERSONA_LABORAL_ELIMINAR', id);
    return { ok: true };
  }
  private async fks(dto: CreateEventosPersonaLaboralDto, empresaId: string) {
    if (
      !(await this.personas.findOne({
        where: { id: dto.personaId, empresaId, deletedAt: IsNull() },
      }))
    )
      throw new NotFoundException('Persona no encontrada para la empresa');
    if (
      dto.fuenteEmpleadosId &&
      !(await this.fuentes.findOne({
        where: { id: dto.fuenteEmpleadosId, empresaId },
      }))
    )
      throw new NotFoundException('Fuente no encontrada para la empresa');
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

  private normalizarDto<T extends Partial<CreateEventosPersonaLaboralDto>>(
    dto: T,
  ): T {
    return {
      ...dto,
      estadoAnterior: dto.estadoAnterior?.trim().toLowerCase(),
      estadoNuevo: dto.estadoNuevo?.trim().toLowerCase(),
    };
  }

  private validarConsistenciaEvento(
    dto: Partial<CreateEventosPersonaLaboralDto>,
  ): void {
    if (dto.estadoAnterior && dto.estadoAnterior === dto.estadoNuevo) {
      throw new BadRequestException(
        'Evento laboral invalido: estadoAnterior y estadoNuevo no pueden ser iguales',
      );
    }

    if (dto.tipoEvento === 'cambio_detectado' && !dto.estadoAnterior) {
      throw new BadRequestException(
        'Evento laboral invalido: cambio_detectado requiere estadoAnterior',
      );
    }
  }

  private async log(user: AuthenticatedUser, accion: string, id: string) {
    await this.bitacora.save(
      this.bitacora.create({
        empresaId: user.empresaId,
        usuarioActorId: user.userId,
        accion,
        entidad: 'eventos_persona_laboral',
        entidadId: id,
        resultado: 'exito',
      }),
    );
  }
}
