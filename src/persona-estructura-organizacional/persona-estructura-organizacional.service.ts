import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { CreatePersonaEstructuraOrganizacionalDto } from './dto/create-persona-estructura-organizacional.dto';
import { UpdatePersonaEstructuraOrganizacionalDto } from './dto/update-persona-estructura-organizacional.dto';
import { PersonaEstructuraOrganizacional } from './entities/persona-estructura-organizacional.entity';
import { Persona } from '../personas/entities/persona.entity';
import { EstructuraOrganizacionalNodo } from '../estructura-organizacional-nodos/entities/estructura-organizacional-nodo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
@Injectable()
export class PersonaEstructuraOrganizacionalService {
  constructor(
    @InjectRepository(PersonaEstructuraOrganizacional)
    private readonly repo: Repository<PersonaEstructuraOrganizacional>,
    @InjectRepository(Persona) private readonly personas: Repository<Persona>,
    @InjectRepository(EstructuraOrganizacionalNodo)
    private readonly nodos: Repository<EstructuraOrganizacionalNodo>,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacora: Repository<BitacoraAuditoriaSistema>,
  ) {}
  async create(
    dto: CreatePersonaEstructuraOrganizacionalDto,
    user: AuthenticatedUser,
  ) {
    this.validarRangoFechas(dto.iniciaEn, dto.finalizaEn);
    await this.actor(user);
    await this.fks(dto.personaId, dto.estructuraNodoId, user.empresaId);
    const item = await this.repo.save(
      this.repo.create({ ...dto, empresaId: user.empresaId }),
    );
    if (item.esPrincipal) {
      await this.normalizarPrincipal(user.empresaId, item.personaId, item.id);
    }
    await this.log(user, 'PERSONA_ESTRUCTURA_CREAR', item.id);
    return item;
  }
  findAll(empresaId: string) {
    return this.repo.find({
      where: { empresaId },
      order: { createdAt: 'DESC' },
    });
  }
  async findOne(id: string, empresaId: string) {
    const item = await this.repo.findOne({ where: { id, empresaId } });
    if (!item)
      throw new NotFoundException('Asignacion organizacional no encontrada');
    return item;
  }
  async update(
    id: string,
    dto: UpdatePersonaEstructuraOrganizacionalDto,
    user: AuthenticatedUser,
  ) {
    const item = await this.findOne(id, user.empresaId);
    this.validarRangoFechas(
      dto.iniciaEn ?? item.iniciaEn,
      dto.finalizaEn ?? item.finalizaEn,
    );
    await this.actor(user);
    await this.fks(
      dto.personaId ?? item.personaId,
      dto.estructuraNodoId ?? item.estructuraNodoId,
      user.empresaId,
    );
    const saved = await this.repo.save(this.repo.merge(item, dto));
    if (saved.esPrincipal) {
      await this.normalizarPrincipal(user.empresaId, saved.personaId, saved.id);
    }
    await this.log(user, 'PERSONA_ESTRUCTURA_ACTUALIZAR', id);
    return saved;
  }
  async remove(id: string, user: AuthenticatedUser) {
    const item = await this.findOne(id, user.empresaId);
    await this.actor(user);
    await this.repo.remove(item);
    await this.log(user, 'PERSONA_ESTRUCTURA_ELIMINAR', id);
    return { ok: true };
  }
  private async fks(personaId: string, nodoId: string, empresaId: string) {
    if (
      !(await this.personas.findOne({
        where: { id: personaId, empresaId, deletedAt: IsNull() },
      }))
    )
      throw new NotFoundException('Persona no encontrada para la empresa');
    if (!(await this.nodos.findOne({ where: { id: nodoId, empresaId } })))
      throw new NotFoundException('Nodo no encontrado para la empresa');
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

  private validarRangoFechas(iniciaEn?: string, finalizaEn?: string) {
    if (!iniciaEn || !finalizaEn) return;
    if (finalizaEn < iniciaEn) {
      throw new BadRequestException(
        'Rango de fechas invalido: finalizaEn no puede ser menor que iniciaEn',
      );
    }
  }

  private async normalizarPrincipal(
    empresaId: string,
    personaId: string,
    idActual: string,
  ) {
    await this.repo.update(
      {
        empresaId,
        personaId,
        esPrincipal: true,
        id: Not(idActual),
      },
      { esPrincipal: false },
    );
  }

  private async log(user: AuthenticatedUser, accion: string, id: string) {
    await this.bitacora.save(
      this.bitacora.create({
        empresaId: user.empresaId,
        usuarioActorId: user.userId,
        accion,
        entidad: 'persona_estructura_organizacional',
        entidadId: id,
        resultado: 'exito',
      }),
    );
  }
}
