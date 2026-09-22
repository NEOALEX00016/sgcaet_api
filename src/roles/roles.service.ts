import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Rol } from './entities/role.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Rol)
    private readonly rolesRepository: Repository<Rol>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async create(
    createRoleDto: CreateRoleDto,
    user: AuthenticatedUser,
  ): Promise<Rol> {
    await this.validarActor(user);

    const dtoNormalizado = this.normalizarCreate(createRoleDto);
    await this.validarCodigoUnico(user.empresaId, dtoNormalizado.codigo);

    const role = this.rolesRepository.create({
      ...dtoNormalizado,
      empresaId: user.empresaId,
      esSistema: false,
      estaActivo: dtoNormalizado.estaActivo ?? true,
    });

    const saved = await this.rolesRepository.save(role);

    await this.registrarBitacora(user, 'ROLES_CREAR', 'roles', saved.id, null, {
      codigo: saved.codigo,
      nombre: saved.nombre,
      esSistema: saved.esSistema,
    });

    return saved;
  }

  async findAll(user: AuthenticatedUser): Promise<Rol[]> {
    return this.rolesRepository.find({
      where: { empresaId: user.empresaId },
      order: { esSistema: 'DESC', nombre: 'ASC' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<Rol> {
    const role = await this.rolesRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });

    if (!role) {
      throw new NotFoundException(`Rol ${id} no encontrado`);
    }

    return role;
  }

  async update(
    id: string,
    updateRoleDto: UpdateRoleDto,
    user: AuthenticatedUser,
  ): Promise<Rol> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    const dtoNormalizado = this.normalizarUpdate(updateRoleDto);

    if (actual.esSistema) {
      throw new ForbiddenException(
        'No se permite modificar un rol de sistema',
      );
    }

    if (dtoNormalizado.codigo && dtoNormalizado.codigo !== actual.codigo) {
      await this.validarCodigoUnico(user.empresaId, dtoNormalizado.codigo, id);
    }

    const merged = this.rolesRepository.merge(actual, dtoNormalizado);
    const saved = await this.rolesRepository.save(merged);

    await this.registrarBitacora(
      user,
      'ROLES_ACTUALIZAR',
      'roles',
      saved.id,
      {
        codigo: actual.codigo,
        nombre: actual.nombre,
        estaActivo: actual.estaActivo,
      },
      {
        codigo: saved.codigo,
        nombre: saved.nombre,
        estaActivo: saved.estaActivo,
      },
    );

    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    if (actual.esSistema) {
      throw new ForbiddenException('No se permite eliminar un rol de sistema');
    }

    await this.rolesRepository.delete({ id, empresaId: user.empresaId });

    await this.registrarBitacora(
      user,
      'ROLES_ELIMINAR',
      'roles',
      actual.id,
      {
        codigo: actual.codigo,
        nombre: actual.nombre,
      },
      null,
    );
  }

  private async validarActor(user: AuthenticatedUser): Promise<void> {
    const actor = await this.usuariosRepository.findOne({
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

  private async validarCodigoUnico(
    empresaId: string,
    codigo: string,
    excluirId?: string,
  ): Promise<void> {
    const existente = await this.rolesRepository.findOne({
      where: { empresaId, codigo },
    });

    if (existente && existente.id !== excluirId) {
      throw new ConflictException(`Ya existe un rol con codigo ${codigo}`);
    }
  }

  private normalizarCreate(dto: CreateRoleDto): CreateRoleDto {
    return {
      ...dto,
      codigo: dto.codigo.trim().toLowerCase(),
      nombre: dto.nombre.trim(),
      descripcion: dto.descripcion?.trim(),
    };
  }

  private normalizarUpdate(dto: UpdateRoleDto): UpdateRoleDto {
    return {
      ...dto,
      codigo: dto.codigo?.trim().toLowerCase(),
      nombre: dto.nombre?.trim(),
      descripcion: dto.descripcion?.trim(),
    };
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
