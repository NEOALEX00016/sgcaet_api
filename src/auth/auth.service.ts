import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { In, IsNull, Repository } from 'typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { LoginDto } from './dto/login.dto';
import { OidcLoginDto } from './dto/oidc-login.dto';
import { Empresa } from '../empresas/entities/empresa.entity';
import { UsuarioRol } from '../usuario-roles/entities/usuario-role.entity';
import { RolPermiso } from '../rol-permisos/entities/rol-permiso.entity';
import { Permiso } from '../permisos/entities/permiso.entity';
import { UsuarioIdentidad } from './entities/usuario-identidad.entity';
import { OidcConfigService, OidcProvider } from './oidc-config.service';
import { DominiosEmpresa } from '../dominios-empresa/entities/dominios-empresa.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(DominiosEmpresa)
    private readonly dominiosRepository: Repository<DominiosEmpresa>,
    @InjectRepository(Empresa)
    private readonly empresasRepository: Repository<Empresa>,
    @InjectRepository(UsuarioRol)
    private readonly usuarioRolesRepository: Repository<UsuarioRol>,
    @InjectRepository(RolPermiso)
    private readonly rolPermisosRepository: Repository<RolPermiso>,
    @InjectRepository(Permiso)
    private readonly permisosRepository: Repository<Permiso>,
    @InjectRepository(UsuarioIdentidad)
    private readonly usuarioIdentidadesRepository: Repository<UsuarioIdentidad>,
    private readonly oidcConfigService: OidcConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto, requestHost?: string): Promise<{
    accessToken: string;
    user: { id: string; empresaId: string; correo: string };
  }> {
    const correo = loginDto.correo.trim().toLowerCase();
    const dominio = correo.split('@')[1];
    const host = requestHost?.split(':')[0]?.trim().toLowerCase();
    const hostname = host && host !== 'localhost' && host !== '127.0.0.1' ? host : dominio;
    const dominioConfigurado = hostname
      ? await this.dominiosRepository.findOne({ where: { hostname, estadoVerificacion: 'verificado' } })
      : null;
    const usuario = await this.usuariosRepository
      .createQueryBuilder('usuario')
      .addSelect('usuario.hashContrasena')
      .where('LOWER(usuario.correo) = :correo', { correo })
      .andWhere(
        dominioConfigurado ? 'usuario.empresa_id = :empresaId' : '1 = 1',
        dominioConfigurado ? { empresaId: dominioConfigurado.empresaId } : {},
      )
      .andWhere('usuario.deletedAt IS NULL')
      .andWhere('usuario.estado = :estado', { estado: 'activo' })
      .getOne();

    if (
      !usuario ||
      !(await bcrypt.compare(loginDto.contrasena, usuario.hashContrasena))
    ) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const payload = {
      sub: usuario.id,
      empresaId: usuario.empresaId,
      correo: usuario.correo,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: usuario.id,
        empresaId: usuario.empresaId,
        correo: usuario.correo,
      },
    };
  }

  async validateUser(userId: string, empresaId: string): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOne({
      where: { id: userId, empresaId, estado: 'activo', deletedAt: IsNull() },
    });
    if (!usuario) {
      throw new UnauthorizedException('Usuario no disponible');
    }
    return usuario;
  }

  async getCurrentUser(userId: string, empresaId: string) {
    const usuario = await this.usuariosRepository.findOne({
      where: { id: userId, empresaId, estado: 'activo', deletedAt: IsNull() },
    });
    const empresa = await this.empresasRepository.findOne({
      where: { id: empresaId, estaActiva: true },
    });

    const permissions = usuario
      ? await this.getPermissionCodes(usuario.id, empresaId)
      : [];

    return {
      user: usuario
        ? {
            id: usuario.id,
            correo: usuario.correo,
            nombres: usuario.nombres,
            apellidos: usuario.apellidos,
            esPropietarioPlataforma: usuario.esPropietarioPlataforma,
          }
        : null,
      empresa: empresa
        ? {
            id: empresa.id,
            codigo: empresa.codigo,
            nombreLegal: empresa.nombreLegal,
            nombreComercial: empresa.nombreComercial,
          }
        : null,
      permissions,
    };
  }

  async loginWithOidc(dto: OidcLoginDto): Promise<{
    accessToken: string;
    user: { id: string; empresaId: string; correo: string };
  }> {
    const provider = dto.proveedor as OidcProvider;
    const correo = dto.correo.trim().toLowerCase();
    const targetEmpresaId =
      dto.empresaId?.trim() ?? (await this.resolveEmpresaIdFromEmailDomain(correo));
    await this.oidcConfigService.ensureProviderEnabled(provider, targetEmpresaId);

    const usuario = await this.usuariosRepository.findOne({
      where: {
        empresaId: targetEmpresaId,
        correo,
        estado: 'activo',
        deletedAt: IsNull(),
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no vinculado al tenant');
    }

    const subjectExterno = dto.subjectExterno.trim();
    const tenantExterno = dto.tenantExterno?.trim() || null;

    const existente = await this.usuarioIdentidadesRepository.findOne({
      where: {
        empresaId: targetEmpresaId,
        proveedor: provider,
        subjectExterno,
      },
    });

    if (existente && existente.usuarioId !== usuario.id) {
      throw new UnauthorizedException(
        'Subject externo ya vinculado a otro usuario en el tenant',
      );
    }

    const identidadUsuario = await this.usuarioIdentidadesRepository.findOne({
      where: {
        empresaId: targetEmpresaId,
        usuarioId: usuario.id,
        proveedor: provider,
      },
    });

    if (
      identidadUsuario &&
      identidadUsuario.subjectExterno !== subjectExterno
    ) {
      throw new UnauthorizedException(
        'Usuario ya vinculado a otro subject externo para este proveedor',
      );
    }

    const now = new Date();
    const identidad = this.usuarioIdentidadesRepository.create({
      id: identidadUsuario?.id,
      empresaId: targetEmpresaId,
      usuarioId: usuario.id,
      proveedor: provider,
      subjectExterno,
      tenantExterno: tenantExterno ?? undefined,
      correoVerificado: correo,
      ultimoLoginEn: now,
    });
    await this.usuarioIdentidadesRepository.save(identidad);

    const payload = {
      sub: usuario.id,
      empresaId: usuario.empresaId,
      correo: usuario.correo,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: usuario.id,
        empresaId: usuario.empresaId,
        correo: usuario.correo,
      },
    };
  }

  async getOidcProviderStatus(empresaId: string) {
    return {
      microsoft: await this.oidcConfigService.getProviderConfig(
        'microsoft',
        empresaId,
      ),
      google: await this.oidcConfigService.getProviderConfig('google', empresaId),
    };
  }

  private async getPermissionCodes(
    userId: string,
    empresaId: string,
  ): Promise<string[]> {
    const assignments = await this.usuarioRolesRepository.find({
      where: { usuarioId: userId, empresaId },
    });
    if (!assignments.length) return [];

    const roleIds = assignments.map((item) => item.rolId);
    const grants = await this.rolPermisosRepository.find({
      where: { empresaId, rolId: In(roleIds) },
    });
    if (!grants.length) return [];

    const permissionIds = Array.from(new Set(grants.map((item) => item.permisoId)));
    const permissions = await this.permisosRepository.find({
      where: { id: In(permissionIds) },
      select: { codigo: true },
    });

    return Array.from(new Set(permissions.map((item) => item.codigo))).sort();
  }

  private async resolveEmpresaIdFromEmailDomain(correo: string): Promise<string> {
    const domain = correo.split('@')[1]?.trim().toLowerCase();
    if (!domain) {
      throw new UnauthorizedException('Correo invalido para resolver tenant');
    }

    const dominioConfigurado = await this.dominiosRepository.findOne({
      where: { hostname: domain, estadoVerificacion: 'verificado' },
    });

    if (!dominioConfigurado) {
      throw new UnauthorizedException(
        'No existe dominio verificado para resolver tenant desde correo',
      );
    }

    return dominioConfigurado.empresaId;
  }
}
