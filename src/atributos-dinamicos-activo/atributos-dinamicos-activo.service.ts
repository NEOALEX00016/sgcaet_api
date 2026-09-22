import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAtributosDinamicosActivoDto } from './dto/create-atributos-dinamicos-activo.dto';
import { UpdateAtributosDinamicosActivoDto } from './dto/update-atributos-dinamicos-activo.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AtributosDinamicosActivo } from './entities/atributos-dinamicos-activo.entity';
import { Activo } from '../activos/entities/activo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class AtributosDinamicosActivoService {
  constructor(
    @InjectRepository(AtributosDinamicosActivo)
    private readonly atributosRepository: Repository<AtributosDinamicosActivo>,
    @InjectRepository(Activo)
    private readonly activosRepository: Repository<Activo>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async create(
    createDto: CreateAtributosDinamicosActivoDto,
    user: AuthenticatedUser,
  ): Promise<AtributosDinamicosActivo> {
    await this.validarActor(user);
    await this.validarActivo(createDto.activoId, user.empresaId);
    this.validarValor(createDto, true);

    const atributo = this.atributosRepository.create({
      ...createDto,
      empresaId: user.empresaId,
      valorNumero:
        typeof createDto.valorNumero === 'number'
          ? createDto.valorNumero.toFixed(4)
          : undefined,
      valorFecha: createDto.valorFecha
        ? createDto.valorFecha.slice(0, 10)
        : undefined,
    });
    const saved = await this.atributosRepository.save(atributo);

    await this.registrarBitacora(
      user,
      'ATRIBUTOS_DINAMICOS_ACTIVO_CREAR',
      'atributos_dinamicos_activo',
      saved.id,
      null,
      {
        activoId: saved.activoId,
        clave: saved.clave,
      },
    );

    return saved;
  }

  async findAll(
    user: AuthenticatedUser,
    activoId?: string,
  ): Promise<AtributosDinamicosActivo[]> {
    const where: Partial<AtributosDinamicosActivo> = {
      empresaId: user.empresaId,
    };
    if (activoId) {
      where.activoId = activoId;
    }

    return this.atributosRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<AtributosDinamicosActivo> {
    const atributo = await this.atributosRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!atributo) {
      throw new NotFoundException(`Atributo dinamico ${id} no encontrado`);
    }

    return atributo;
  }

  async update(
    id: string,
    updateDto: UpdateAtributosDinamicosActivoDto,
    user: AuthenticatedUser,
  ): Promise<AtributosDinamicosActivo> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    const activoId = updateDto.activoId ?? actual.activoId;
    await this.validarActivo(activoId, actual.empresaId);
    this.validarValor(
      {
        valorTexto: updateDto.valorTexto ?? actual.valorTexto,
        valorNumero:
          updateDto.valorNumero ??
          (actual.valorNumero ? Number(actual.valorNumero) : undefined),
        valorFecha: updateDto.valorFecha ?? actual.valorFecha,
        valorBooleano: updateDto.valorBooleano ?? actual.valorBooleano,
      },
      false,
    );

    const merged = this.atributosRepository.merge(actual, {
      ...updateDto,
      valorNumero:
        typeof updateDto.valorNumero === 'number'
          ? updateDto.valorNumero.toFixed(4)
          : actual.valorNumero,
      valorFecha: updateDto.valorFecha
        ? updateDto.valorFecha.slice(0, 10)
        : actual.valorFecha,
    });
    const saved = await this.atributosRepository.save(merged);

    await this.registrarBitacora(
      user,
      'ATRIBUTOS_DINAMICOS_ACTIVO_ACTUALIZAR',
      'atributos_dinamicos_activo',
      saved.id,
      {
        clave: actual.clave,
      },
      {
        clave: saved.clave,
      },
    );

    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    await this.atributosRepository.delete({
      id: actual.id,
      empresaId: user.empresaId,
    });

    await this.registrarBitacora(
      user,
      'ATRIBUTOS_DINAMICOS_ACTIVO_ELIMINAR',
      'atributos_dinamicos_activo',
      actual.id,
      {
        clave: actual.clave,
      },
      null,
    );
  }

  private validarValor(
    payload: {
      valorTexto?: string;
      valorNumero?: number;
      valorFecha?: string;
      valorBooleano?: boolean;
    },
    requireOne: boolean,
  ): void {
    const valores = [
      payload.valorTexto,
      payload.valorNumero,
      payload.valorFecha,
      payload.valorBooleano,
    ].filter((value) => value !== undefined && value !== null);

    if (requireOne && valores.length === 0) {
      throw new BadRequestException(
        'El atributo dinamico requiere al menos un valor',
      );
    }

    if (valores.length > 1) {
      throw new BadRequestException(
        'Un atributo dinamico solo puede tener un tipo de valor por registro',
      );
    }
  }

  private async validarActivo(
    activoId: string,
    empresaId: string,
  ): Promise<void> {
    const activo = await this.activosRepository.findOne({
      where: {
        id: activoId,
        empresaId,
        deletedAt: IsNull(),
      },
    });

    if (!activo) {
      throw new NotFoundException(
        'Activo no encontrado para la empresa indicada',
      );
    }
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
