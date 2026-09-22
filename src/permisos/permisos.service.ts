import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePermisoDto } from './dto/create-permiso.dto';
import { UpdatePermisoDto } from './dto/update-permiso.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Permiso } from './entities/permiso.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class PermisosService {
  constructor(
    @InjectRepository(Permiso)
    private readonly permisosRepository: Repository<Permiso>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async create(
    createPermisoDto: CreatePermisoDto,
    user: AuthenticatedUser,
  ): Promise<Permiso> {
    await this.validarActor(user);

    const dtoNormalizado = this.normalizarCreate(createPermisoDto);
    await this.validarCodigoUnico(dtoNormalizado.codigo);

    const permiso = this.permisosRepository.create(dtoNormalizado);
    const saved = await this.permisosRepository.save(permiso);

    await this.registrarBitacora(
      user,
      'PERMISOS_CREAR',
      'permisos',
      saved.id,
      null,
      {
        codigo: saved.codigo,
        moduloClave: saved.moduloClave,
        recursoClave: saved.recursoClave,
        accionClave: saved.accionClave,
      },
    );

    return saved;
  }

  async findAll(user: AuthenticatedUser): Promise<Permiso[]> {
    return this.permisosRepository.find({
      order: {
        moduloClave: 'ASC',
        recursoClave: 'ASC',
        accionClave: 'ASC',
        codigo: 'ASC',
      },
    });
  }

  async findCatalogoAgrupado(user: AuthenticatedUser): Promise<
    Array<{
      moduloClave: string;
      recursos: Array<{
        recursoClave: string;
        permisos: Array<{
          id: string;
          codigo: string;
          accionClave: string;
          descripcion?: string;
        }>;
      }>;
    }>
  > {
    const permisos = await this.findAll(user);
    const catalogo = new Map<
      string,
      Map<
        string,
        Array<{
          id: string;
          codigo: string;
          accionClave: string;
          descripcion?: string;
        }>
      >
    >();

    for (const permiso of permisos) {
      if (!catalogo.has(permiso.moduloClave)) {
        catalogo.set(permiso.moduloClave, new Map());
      }

      const recursos = catalogo.get(permiso.moduloClave);
      if (!recursos) {
        continue;
      }

      if (!recursos.has(permiso.recursoClave)) {
        recursos.set(permiso.recursoClave, []);
      }

      const listaPermisos = recursos.get(permiso.recursoClave);
      if (!listaPermisos) {
        continue;
      }

      listaPermisos.push({
        id: permiso.id,
        codigo: permiso.codigo,
        accionClave: permiso.accionClave,
        descripcion: permiso.descripcion,
      });
    }

    return Array.from(catalogo.entries()).map(([moduloClave, recursos]) => ({
      moduloClave,
      recursos: Array.from(recursos.entries()).map(
        ([recursoClave, permisosAgrupados]) => ({
          recursoClave,
          permisos: permisosAgrupados,
        }),
      ),
    }));
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<Permiso> {
    const permiso = await this.permisosRepository.findOne({ where: { id } });
    if (!permiso) {
      throw new NotFoundException(`Permiso ${id} no encontrado`);
    }
    return permiso;
  }

  async update(
    id: string,
    updatePermisoDto: UpdatePermisoDto,
    user: AuthenticatedUser,
  ): Promise<Permiso> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    const dtoNormalizado = this.normalizarUpdate(updatePermisoDto);
    if (dtoNormalizado.codigo && dtoNormalizado.codigo !== actual.codigo) {
      await this.validarCodigoUnico(dtoNormalizado.codigo, actual.id);
    }

    const merged = this.permisosRepository.merge(actual, dtoNormalizado);
    const saved = await this.permisosRepository.save(merged);

    await this.registrarBitacora(
      user,
      'PERMISOS_ACTUALIZAR',
      'permisos',
      saved.id,
      {
        codigo: actual.codigo,
        moduloClave: actual.moduloClave,
        recursoClave: actual.recursoClave,
        accionClave: actual.accionClave,
      },
      {
        codigo: saved.codigo,
        moduloClave: saved.moduloClave,
        recursoClave: saved.recursoClave,
        accionClave: saved.accionClave,
      },
    );

    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    await this.permisosRepository.delete({ id });

    await this.registrarBitacora(
      user,
      'PERMISOS_ELIMINAR',
      'permisos',
      actual.id,
      {
        codigo: actual.codigo,
        moduloClave: actual.moduloClave,
        recursoClave: actual.recursoClave,
        accionClave: actual.accionClave,
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
      throw new NotFoundException('Usuario actor no encontrado');
    }
  }

  private async validarCodigoUnico(
    codigo: string,
    excluirId?: string,
  ): Promise<void> {
    const existente = await this.permisosRepository.findOne({
      where: { codigo },
    });

    if (existente && existente.id !== excluirId) {
      throw new ConflictException(`Ya existe un permiso con codigo ${codigo}`);
    }
  }

  private normalizarCreate(dto: CreatePermisoDto): CreatePermisoDto {
    return {
      ...dto,
      codigo: dto.codigo.trim().toLowerCase(),
      moduloClave: dto.moduloClave.trim().toLowerCase(),
      recursoClave: dto.recursoClave.trim().toLowerCase(),
      accionClave: dto.accionClave.trim().toLowerCase(),
      descripcion: dto.descripcion?.trim(),
    };
  }

  private normalizarUpdate(dto: UpdatePermisoDto): UpdatePermisoDto {
    return {
      ...dto,
      codigo: dto.codigo?.trim().toLowerCase(),
      moduloClave: dto.moduloClave?.trim().toLowerCase(),
      recursoClave: dto.recursoClave?.trim().toLowerCase(),
      accionClave: dto.accionClave?.trim().toLowerCase(),
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
