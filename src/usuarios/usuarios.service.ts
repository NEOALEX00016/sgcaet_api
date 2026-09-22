import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { SetPlatformOwnerDto } from './dto/set-platform-owner.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario } from './entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async create(
    createUsuarioDto: CreateUsuarioDto,
    user: AuthenticatedUser,
  ): Promise<Usuario> {
    const dtoNormalizado = this.normalizarCreate(createUsuarioDto);
    const { contrasena, ...payload } = dtoNormalizado;

    await this.validarCorreoUnico(user.empresaId, payload.correo);
    if (payload.nombreUsuario) {
      await this.validarNombreUsuarioUnico(user.empresaId, payload.nombreUsuario);
    }

    const usuario = this.usuariosRepository.create({
      ...payload,
      empresaId: user.empresaId,
      hashContrasena: await bcrypt.hash(contrasena, 12),
      debeCambiarContrasena: createUsuarioDto.debeCambiarContrasena ?? true,
      esPropietarioPlataforma: false,
      estado: createUsuarioDto.estado ?? 'activo',
    });

    const saved = await this.usuariosRepository.save(usuario);

    await this.registrarBitacora(
      user,
      'USUARIOS_CREAR',
      'usuarios',
      saved.id,
      null,
      {
        correo: saved.correo,
        nombreUsuario: saved.nombreUsuario,
        estado: saved.estado,
      },
    );

    return this.sanitizarUsuario(saved);
  }

  async findAll(user: AuthenticatedUser): Promise<Usuario[]> {
    const usuarios = await this.usuariosRepository.find({
      where: { empresaId: user.empresaId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return usuarios.map((usuario) => this.sanitizarUsuario(usuario));
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOne({
      where: { id, empresaId: user.empresaId, deletedAt: IsNull() },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }

    return this.sanitizarUsuario(usuario);
  }

  async update(
    id: string,
    updateUsuarioDto: UpdateUsuarioDto,
    user: AuthenticatedUser,
  ): Promise<Usuario> {
    const actual = await this.findOne(id, user);
    const dtoNormalizado = this.normalizarUpdate(updateUsuarioDto);
    const { contrasena, ...payload } = dtoNormalizado;

    if (payload.correo && payload.correo !== actual.correo) {
      await this.validarCorreoUnico(user.empresaId, payload.correo, id);
    }

    if (
      payload.nombreUsuario &&
      payload.nombreUsuario !== actual.nombreUsuario
    ) {
      await this.validarNombreUsuarioUnico(
        user.empresaId,
        payload.nombreUsuario,
        id,
      );
    }

    const merged = this.usuariosRepository.merge(actual, {
      ...payload,
      ...(contrasena
        ? { hashContrasena: await bcrypt.hash(contrasena, 12), debeCambiarContrasena: true }
        : {}),
    });
    const saved = await this.usuariosRepository.save(merged);

    await this.registrarBitacora(
      user,
      'USUARIOS_ACTUALIZAR',
      'usuarios',
      saved.id,
      {
        correo: actual.correo,
        nombreUsuario: actual.nombreUsuario,
        estado: actual.estado,
      },
      {
        correo: saved.correo,
        nombreUsuario: saved.nombreUsuario,
        estado: saved.estado,
      },
    );

    return this.sanitizarUsuario(saved);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);
    const activity = await this.bitacoraRepository.findOne({
      where: {
        empresaId: user.empresaId,
        usuarioActorId: id,
      },
    });
    if (activity || actual.ultimoAccesoEn) {
      actual.deletedAt = new Date();
      actual.estado = 'inactivo';
      await this.usuariosRepository.save(actual);
      await this.registrarBitacora(
        user,
        'USUARIOS_DESACTIVAR_POR_HISTORIAL',
        'usuarios',
        actual.id,
        { estado: 'activo' },
        { estado: actual.estado, motivo: 'Usuario con acceso o actividad registrada' },
      );
      return;
    }
    actual.deletedAt = new Date();
    actual.estado = 'inactivo';
    await this.usuariosRepository.save(actual);

    await this.registrarBitacora(
      user,
      'USUARIOS_DESACTIVAR',
      'usuarios',
      actual.id,
      {
        estado: 'activo',
      },
      {
        estado: actual.estado,
        deletedAt: actual.deletedAt.toISOString(),
      },
    );
  }

  async setPlatformOwner(
    id: string,
    dto: SetPlatformOwnerDto,
    user: AuthenticatedUser,
  ): Promise<Usuario> {
    const actor = await this.usuariosRepository.findOne({
      where: {
        id: user.userId,
        empresaId: user.empresaId,
        deletedAt: IsNull(),
      },
    });
    if (!actor || !actor.esPropietarioPlataforma) {
      throw new NotFoundException('Solo PlatformOwner puede conceder o revocar');
    }

    const target = await this.usuariosRepository.findOne({
      where: {
        id,
        empresaId: user.empresaId,
        deletedAt: IsNull(),
      },
    });
    if (!target) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }

    if (target.esPropietarioPlataforma === dto.esPropietarioPlataforma) {
      return this.sanitizarUsuario(target);
    }

    const before = { esPropietarioPlataforma: target.esPropietarioPlataforma };
    target.esPropietarioPlataforma = dto.esPropietarioPlataforma;
    const saved = await this.usuariosRepository.save(target);

    const registro = this.bitacoraRepository.create({
      empresaId: user.empresaId,
      usuarioActorId: user.userId,
      accion: dto.esPropietarioPlataforma
        ? 'USUARIOS_PLATFORM_OWNER_CONCEDER'
        : 'USUARIOS_PLATFORM_OWNER_REVOCAR',
      entidad: 'usuarios',
      entidadId: saved.id,
      valoresAnteriores: before,
      valoresNuevos: {
        esPropietarioPlataforma: saved.esPropietarioPlataforma,
      },
      resultado: 'exito',
      motivo: dto.motivo?.trim() || undefined,
    });
    await this.bitacoraRepository.save(registro);

    return this.sanitizarUsuario(saved);
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

  private sanitizarUsuario(usuario: Usuario): Usuario {
    const seguro = { ...usuario } as Partial<Usuario>;
    delete seguro.hashContrasena;
    return seguro as Usuario;
  }

  private async validarCorreoUnico(
    empresaId: string,
    correo: string,
    excluirId?: string,
  ): Promise<void> {
    const existente = await this.usuariosRepository.findOne({
      where: { empresaId, correo, deletedAt: IsNull() },
    });

    if (existente && existente.id !== excluirId) {
      throw new ConflictException(`Ya existe un usuario con correo ${correo}`);
    }
  }

  private async validarNombreUsuarioUnico(
    empresaId: string,
    nombreUsuario: string,
    excluirId?: string,
  ): Promise<void> {
    const existente = await this.usuariosRepository.findOne({
      where: { empresaId, nombreUsuario, deletedAt: IsNull() },
    });

    if (existente && existente.id !== excluirId) {
      throw new ConflictException(
        `Ya existe un usuario con nombre de usuario ${nombreUsuario}`,
      );
    }
  }

  private normalizarCreate(dto: CreateUsuarioDto): CreateUsuarioDto {
    return {
      ...dto,
      correo: dto.correo.trim().toLowerCase(),
      nombreUsuario: dto.nombreUsuario?.trim().toLowerCase(),
      nombres: dto.nombres.trim(),
      apellidos: dto.apellidos.trim(),
      contrasena: dto.contrasena.trim(),
    };
  }

  private normalizarUpdate(dto: UpdateUsuarioDto): UpdateUsuarioDto {
    return {
      ...dto,
      correo: dto.correo?.trim().toLowerCase(),
      nombreUsuario: dto.nombreUsuario?.trim().toLowerCase(),
      nombres: dto.nombres?.trim(),
      apellidos: dto.apellidos?.trim(),
      contrasena: dto.contrasena?.trim(),
    };
  }
}
