import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateBolsaTelecomDto } from './dto/create-bolsa-telecom.dto';
import { UpdateBolsaTelecomDto } from './dto/update-bolsa-telecom.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { BolsaTelecom } from './entities/bolsas-telecom.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class BolsasTelecomService {
  constructor(
    @InjectRepository(BolsaTelecom)
    private readonly bolsasRepository: Repository<BolsaTelecom>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(LineaTelefonica)
    private readonly lineasRepository: Repository<LineaTelefonica>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async create(
    createBolsaTelecomDto: CreateBolsaTelecomDto,
    user: AuthenticatedUser,
  ): Promise<BolsaTelecom> {
    await this.validarActor(user);
    await this.validarAlcance(
      user.empresaId,
      createBolsaTelecomDto.alcance,
      createBolsaTelecomDto.lineaTelefonicaId,
    );
    this.validarUnidad(createBolsaTelecomDto.tipoBolsa, createBolsaTelecomDto.unidad);
    this.validarVigencia(
      createBolsaTelecomDto.iniciaEn,
      createBolsaTelecomDto.venceEn,
    );

    const bolsa = this.bolsasRepository.create({
      ...createBolsaTelecomDto,
      empresaId: user.empresaId,
      iniciaEn: new Date(createBolsaTelecomDto.iniciaEn),
      venceEn: createBolsaTelecomDto.venceEn
        ? new Date(createBolsaTelecomDto.venceEn)
        : undefined,
      estado: createBolsaTelecomDto.estado ?? 'activa',
    });
    const saved = await this.bolsasRepository.save(bolsa);

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'BOLSAS_TELECOM_CREAR',
      'bolsas_telecom',
      saved.id,
      null,
      {
        alcance: saved.alcance,
        tipoBolsa: saved.tipoBolsa,
        estado: saved.estado,
      },
    );

    return saved;
  }

  async findAll(user: AuthenticatedUser): Promise<BolsaTelecom[]> {
    return this.bolsasRepository.find({
      where: { empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<BolsaTelecom> {
    const bolsa = await this.bolsasRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!bolsa) {
      throw new NotFoundException(`Bolsa telecom ${id} no encontrada`);
    }

    return bolsa;
  }

  async update(
    id: string,
    updateBolsaTelecomDto: UpdateBolsaTelecomDto,
    user: AuthenticatedUser,
  ): Promise<BolsaTelecom> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    const alcance = updateBolsaTelecomDto.alcance ?? actual.alcance;
    const lineaTelefonicaId =
      updateBolsaTelecomDto.lineaTelefonicaId ?? actual.lineaTelefonicaId;
    await this.validarAlcance(actual.empresaId, alcance, lineaTelefonicaId);

    const tipoBolsa = updateBolsaTelecomDto.tipoBolsa ?? actual.tipoBolsa;
    const unidad = updateBolsaTelecomDto.unidad ?? actual.unidad;
    this.validarUnidad(tipoBolsa, unidad);

    const iniciaEn =
      updateBolsaTelecomDto.iniciaEn ?? actual.iniciaEn.toISOString();
    const venceEn =
      updateBolsaTelecomDto.venceEn ?? actual.venceEn?.toISOString();
    this.validarVigencia(iniciaEn, venceEn);

    const payload = updateBolsaTelecomDto;
    const merged = this.bolsasRepository.merge(actual, {
      ...payload,
      iniciaEn: payload.iniciaEn ? new Date(payload.iniciaEn) : actual.iniciaEn,
      venceEn: payload.venceEn ? new Date(payload.venceEn) : actual.venceEn,
    });
    const saved = await this.bolsasRepository.save(merged);

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'BOLSAS_TELECOM_ACTUALIZAR',
      'bolsas_telecom',
      saved.id,
      {
        estado: actual.estado,
        venceEn: actual.venceEn?.toISOString() ?? null,
      },
      {
        estado: saved.estado,
        venceEn: saved.venceEn?.toISOString() ?? null,
      },
    );

    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    actual.estado = 'cancelada';
    await this.bolsasRepository.save(actual);

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'BOLSAS_TELECOM_CANCELAR',
      'bolsas_telecom',
      actual.id,
      {
        estado: 'activa',
      },
      {
        estado: actual.estado,
      },
    );
  }

  private async validarAlcance(
    empresaId: string,
    alcance: string,
    lineaTelefonicaId?: string,
  ): Promise<void> {
    if (alcance === 'global' && lineaTelefonicaId) {
      throw new BadRequestException(
        'Una bolsa global no debe tener lineaTelefonicaId',
      );
    }

    if (alcance === 'linea' && !lineaTelefonicaId) {
      throw new BadRequestException(
        'Una bolsa por linea requiere lineaTelefonicaId',
      );
    }

    if (alcance === 'linea' && lineaTelefonicaId) {
      const linea = await this.lineasRepository.findOne({
        where: { id: lineaTelefonicaId, empresaId },
      });

      if (!linea || !linea.estaActiva) {
        throw new NotFoundException(
          'Linea telefonica no encontrada para la empresa indicada',
        );
      }
    }
  }

  private validarVigencia(iniciaEn: string, venceEn?: string): void {
    if (!venceEn) {
      return;
    }

    if (new Date(venceEn).getTime() <= new Date(iniciaEn).getTime()) {
      throw new BadRequestException(
        'La fecha de vencimiento debe ser mayor que la fecha de inicio',
      );
    }
  }

  private validarUnidad(tipoBolsa: string, unidad: string): void {
    const unidadNormalizada = unidad.trim().toLowerCase();
    const allowedByTipo: Record<string, string[]> = {
      minutos: ['minutos', 'min'],
      datos: ['gb', 'mb'],
      sms: ['sms'],
      saldo: ['dop', 'usd'],
    };

    const allowed = allowedByTipo[tipoBolsa] ?? [];
    if (!allowed.includes(unidadNormalizada)) {
      throw new BadRequestException(
        `Unidad invalida para ${tipoBolsa}. Valores permitidos: ${allowed.join(', ')}`,
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
    usuarioActorId: string,
    empresaId: string,
    accion: string,
    entidad: string,
    entidadId: string,
    valoresAnteriores: Record<string, unknown> | null,
    valoresNuevos: Record<string, unknown> | null,
  ): Promise<void> {
    const registro = this.bitacoraRepository.create({
      empresaId,
      usuarioActorId,
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
