import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Empresa } from './entities/empresa.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../roles/entities/role.entity';
import { Permiso } from '../permisos/entities/permiso.entity';
import { RolPermiso } from '../rol-permisos/entities/rol-permiso.entity';
import { UsuarioRol } from '../usuario-roles/entities/usuario-role.entity';

@Injectable()
export class EmpresasService {
  constructor(
    @InjectRepository(Empresa)
    private readonly empresasRepository: Repository<Empresa>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(Rol)
    private readonly rolesRepository: Repository<Rol>,
    @InjectRepository(Permiso)
    private readonly permisosRepository: Repository<Permiso>,
    @InjectRepository(RolPermiso)
    private readonly rolPermisosRepository: Repository<RolPermiso>,
    @InjectRepository(UsuarioRol)
    private readonly usuarioRolesRepository: Repository<UsuarioRol>,
  ) {}

  async create(
    createEmpresaDto: CreateEmpresaDto,
    actor: AuthenticatedUser,
  ): Promise<Empresa> {
    const { adminCorreo, adminNombres, adminApellidos, adminContrasena, adminNombreUsuario, ...empresaPayload } = createEmpresaDto;
    const empresa = this.empresasRepository.create({
      ...empresaPayload,
      codigo: empresaPayload.codigo.trim().toUpperCase(),
      nombreLegal: empresaPayload.nombreLegal.trim(),
      nombreComercial: empresaPayload.nombreComercial?.trim(),
      codigoPais: empresaPayload.codigoPais.trim().toUpperCase(),
      tipoIdentificacionFiscal: empresaPayload.tipoIdentificacionFiscal
        .trim()
        .toUpperCase(),
      numeroIdentificacionFiscal:
        empresaPayload.numeroIdentificacionFiscal.trim(),
      correo: empresaPayload.correo?.trim().toLowerCase(),
      telefono: empresaPayload.telefono?.trim(),
      sitioWeb: empresaPayload.sitioWeb?.trim(),
      zonaHoraria: empresaPayload.zonaHoraria ?? 'America/Santo_Domingo',
      moneda: empresaPayload.moneda ?? 'DOP',
      estado: empresaPayload.estado ?? 'activa',
      estaActiva: empresaPayload.estaActiva ?? true,
    });

    const saved = await this.empresasRepository.save(empresa);
    const admin = await this.usuariosRepository.save(
      this.usuariosRepository.create({
        empresaId: saved.id,
        correo: adminCorreo.trim().toLowerCase(),
        nombreUsuario: adminNombreUsuario?.trim(),
        nombres: adminNombres.trim(),
        apellidos: adminApellidos.trim(),
        hashContrasena: await bcrypt.hash(adminContrasena, 12),
        esPropietarioPlataforma: false,
        estado: 'activo',
      }),
    );
    const role = await this.rolesRepository.save(
      this.rolesRepository.create({
        empresaId: saved.id,
        codigo: 'tenant_superadmin',
        nombre: 'Superadministrador del tenant',
        descripcion: 'Administrador inicial creado por PlatformOwner.',
        esSistema: true,
        estaActivo: true,
      }),
    );
    const permisos = (await this.permisosRepository.find()).filter(
      permiso => !permiso.codigo.startsWith('plataforma.'),
    );
    if (permisos.length) {
      await this.rolPermisosRepository.save(
        permisos.map(permiso =>
          this.rolPermisosRepository.create({
            empresaId: saved.id,
            rolId: role.id,
            permisoId: permiso.id,
            otorgadoPor: actor.userId,
            otorgadoEn: new Date(),
          }),
        ),
      );
    }
    await this.usuarioRolesRepository.save(
      this.usuarioRolesRepository.create({
        empresaId: saved.id,
        usuarioId: admin.id,
        rolId: role.id,
        asignadoPor: actor.userId,
        asignadoEn: new Date(),
      }),
    );
    await this.registrarBitacora(actor, saved.id, 'USUARIO_ADMIN_INICIAL_CREAR', null, {
      usuarioId: admin.id,
      correo: admin.correo,
      rol: role.codigo,
    });
    await this.registrarBitacora(
      actor,
      saved.id,
      'EMPRESAS_CREAR',
      null,
      {
        codigo: saved.codigo,
        nombreLegal: saved.nombreLegal,
        estado: saved.estado,
        estaActiva: saved.estaActiva,
      },
    );
    return saved;
  }

  async findAll(): Promise<Empresa[]> {
    return this.empresasRepository.find({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Empresa> {
    const empresa = await this.empresasRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!empresa) {
      throw new NotFoundException(`Empresa ${id} no encontrada`);
    }

    return empresa;
  }

  async update(
    id: string,
    updateEmpresaDto: UpdateEmpresaDto,
    actor: AuthenticatedUser,
  ): Promise<Empresa> {
    const empresa = await this.findOne(id);
    const before = {
      codigo: empresa.codigo,
      nombreLegal: empresa.nombreLegal,
      estado: empresa.estado,
      estaActiva: empresa.estaActiva,
    };

    const merged = this.empresasRepository.merge(empresa, {
      ...updateEmpresaDto,
      codigo: updateEmpresaDto.codigo?.trim().toUpperCase(),
      nombreLegal: updateEmpresaDto.nombreLegal?.trim(),
      nombreComercial: updateEmpresaDto.nombreComercial?.trim(),
      codigoPais: updateEmpresaDto.codigoPais?.trim().toUpperCase(),
      tipoIdentificacionFiscal: updateEmpresaDto.tipoIdentificacionFiscal
        ?.trim()
        .toUpperCase(),
      numeroIdentificacionFiscal:
        updateEmpresaDto.numeroIdentificacionFiscal?.trim(),
      correo: updateEmpresaDto.correo?.trim().toLowerCase(),
      telefono: updateEmpresaDto.telefono?.trim(),
      sitioWeb: updateEmpresaDto.sitioWeb?.trim(),
    });

    const saved = await this.empresasRepository.save(merged);
    await this.registrarBitacora(
      actor,
      saved.id,
      'EMPRESAS_ACTUALIZAR',
      before,
      {
        codigo: saved.codigo,
        nombreLegal: saved.nombreLegal,
        estado: saved.estado,
        estaActiva: saved.estaActiva,
      },
    );
    return saved;
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    if (id === actor.empresaId) {
      throw new BadRequestException(
        'No se puede desactivar la empresa del actor autenticado',
      );
    }
    const empresa = await this.findOne(id);
    const before = {
      estado: empresa.estado,
      estaActiva: empresa.estaActiva,
      deletedAt: empresa.deletedAt?.toISOString(),
    };
    empresa.deletedAt = new Date();
    empresa.estaActiva = false;
    empresa.estado = 'inactiva';
    const saved = await this.empresasRepository.save(empresa);
    await this.registrarBitacora(
      actor,
      saved.id,
      'EMPRESAS_ELIMINAR',
      before,
      {
        estado: saved.estado,
        estaActiva: saved.estaActiva,
        deletedAt: saved.deletedAt?.toISOString(),
      },
    );
  }

  private async registrarBitacora(
    actor: AuthenticatedUser,
    empresaIdObjetivo: string,
    accion: string,
    valoresAnteriores: Record<string, unknown> | null,
    valoresNuevos: Record<string, unknown> | null,
  ): Promise<void> {
    const registro = this.bitacoraRepository.create({
      empresaId: empresaIdObjetivo,
      usuarioActorId: actor.userId,
      accion,
      entidad: 'empresas',
      entidadId: empresaIdObjetivo,
      valoresAnteriores: valoresAnteriores ?? undefined,
      valoresNuevos: valoresNuevos ?? undefined,
      resultado: 'exito',
    });
    await this.bitacoraRepository.save(registro);
  }
}
