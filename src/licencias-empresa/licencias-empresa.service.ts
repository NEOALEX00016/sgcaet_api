import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateLicenciasEmpresaDto } from './dto/create-licencias-empresa.dto';
import { UpdateLicenciasEmpresaDto } from './dto/update-licencias-empresa.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LicenciaEmpresa } from './entities/licencias-empresa.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { LicenciaFirmaService } from './licencia-firma.service';

@Injectable()
export class LicenciasEmpresaService {
  constructor(
    @InjectRepository(LicenciaEmpresa)
    private readonly licenciasRepository: Repository<LicenciaEmpresa>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
    private readonly licenciaFirmaService: LicenciaFirmaService,
  ) {}

  async create(
    createDto: CreateLicenciasEmpresaDto,
    user: AuthenticatedUser,
    targetEmpresaId?: string,
  ): Promise<LicenciaEmpresa> {
    const venceEn = createDto.venceEn ?? '9999-12-31T23:59:59.999Z';
    this.validarVentanaFechas(createDto.iniciaEn, venceEn);

    const licencia = this.licenciasRepository.create({
      ...createDto,
        empresaId: targetEmpresaId ?? user.empresaId,
      estado: createDto.estado ?? 'activa',
      modoSoloLecturaAlVencer: createDto.modoSoloLecturaAlVencer ?? true,
      iniciaEn: new Date(createDto.iniciaEn),
      venceEn: new Date(venceEn),
      graciaHasta: createDto.graciaHasta
        ? new Date(createDto.graciaHasta)
        : undefined,
    });

    if (
      this.licenciaFirmaService.enforcementEnabled() &&
      (!createDto.payloadFirmado || !createDto.firmaLicencia)
    ) {
      throw new BadRequestException(
        'La licencia debe ser emitida y firmada por la plataforma del dueño.',
      );
    }

    const saved = await this.licenciasRepository.save(licencia);

    await this.registrarBitacora(
      user.userId,
      targetEmpresaId ?? user.empresaId,
      'LICENCIAS_CREAR',
      'licencias_empresa',
      saved.id,
      null,
      {
      tipoLicencia: saved.tipoLicencia,
        estado: saved.estado,
        venceEn: saved.venceEn.toISOString(),
        modoSoloLecturaAlVencer: saved.modoSoloLecturaAlVencer,
      },
    );

    return saved;
  }

  async findAll(empresaId: string): Promise<LicenciaEmpresa[]> {
    return this.licenciasRepository.find({
      where: { empresaId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, empresaId: string): Promise<LicenciaEmpresa> {
    const licencia = await this.licenciasRepository.findOne({
      where: { id, empresaId },
    });
    if (!licencia) {
      throw new NotFoundException(`Licencia ${id} no encontrada`);
    }
    return licencia;
  }

  async update(
    id: string,
    updateDto: UpdateLicenciasEmpresaDto,
    user: AuthenticatedUser,
    targetEmpresaId?: string,
  ): Promise<LicenciaEmpresa> {
    const scopeEmpresaId = targetEmpresaId ?? user.empresaId;
    const actual = await this.findOne(id, scopeEmpresaId);

    const iniciaEn = updateDto.iniciaEn ?? actual.iniciaEn.toISOString();
    const venceEn = updateDto.venceEn ?? actual.venceEn.toISOString();
    this.validarVentanaFechas(iniciaEn, venceEn);

    const merged = this.licenciasRepository.merge(actual, {
      ...updateDto,
      iniciaEn: updateDto.iniciaEn
        ? new Date(updateDto.iniciaEn)
        : actual.iniciaEn,
      venceEn: updateDto.venceEn ? new Date(updateDto.venceEn) : actual.venceEn,
      graciaHasta: updateDto.graciaHasta
        ? new Date(updateDto.graciaHasta)
        : actual.graciaHasta,
    });

    const saved = await this.licenciasRepository.save(merged);

    await this.registrarBitacora(
      user.userId,
      scopeEmpresaId,
      'LICENCIAS_ACTUALIZAR',
      'licencias_empresa',
      saved.id,
      {
        estado: actual.estado,
        venceEn: actual.venceEn.toISOString(),
      },
      {
        estado: saved.estado,
        venceEn: saved.venceEn.toISOString(),
      },
    );

    return saved;
  }

  async remove(
    id: string,
    user: AuthenticatedUser,
    targetEmpresaId?: string,
  ): Promise<void> {
    const scopeEmpresaId = targetEmpresaId ?? user.empresaId;
    const actual = await this.findOne(id, scopeEmpresaId);

    await this.licenciasRepository.delete({ id });

    await this.registrarBitacora(
      user.userId,
      scopeEmpresaId,
      'LICENCIAS_ELIMINAR',
      'licencias_empresa',
      actual.id,
      {
        estado: actual.estado,
        venceEn: actual.venceEn.toISOString(),
      },
      null,
    );
  }

  async evaluarModoSoloLectura(
    empresaId: string,
  ): Promise<{ soloLectura: boolean; razon: string }> {
    const ahora = new Date();
    const licencias = await this.licenciasRepository.find({
      where: { empresaId },
      order: { venceEn: 'DESC' },
    });
    const licencia = licencias.find(
      (item) =>
        item.estado === 'activa' && item.iniciaEn.getTime() <= ahora.getTime(),
    );

    if (!licencia) {
      return { soloLectura: true, razon: 'Sin licencia activa' };
    }

    if (
      this.licenciaFirmaService.enforcementEnabled() &&
      !this.licenciaFirmaService.validar(licencia)
    ) {
      return { soloLectura: true, razon: 'Licencia no verificada por la plataforma' };
    }

    const vencida = licencia.tipoLicencia !== 'perpetua' && licencia.venceEn.getTime() < ahora.getTime();
    const enGracia = licencia.graciaHasta
      ? licencia.graciaHasta.getTime() >= ahora.getTime()
      : false;

    if (!vencida || enGracia) {
      return { soloLectura: false, razon: 'Licencia vigente' };
    }

    if (!licencia.modoSoloLecturaAlVencer) {
      return {
        soloLectura: false,
        razon: 'Politica de licencia sin solo lectura al vencer',
      };
    }

    return { soloLectura: true, razon: 'Licencia vencida' };
  }

  async emitirLicenciaFirmada(empresaId: string) {
    const licencia = await this.licenciasRepository.findOne({
      where: { empresaId },
      order: { venceEn: 'DESC' },
    });
    if (!licencia) throw new NotFoundException('No existe licencia para el tenant');
    const payloadFirmado = this.licenciaFirmaService.crearPayload(licencia);
    const firmaLicencia = this.licenciaFirmaService.firmar(payloadFirmado);
    if (licencia.payloadFirmado !== payloadFirmado || licencia.firmaLicencia !== firmaLicencia) {
      licencia.payloadFirmado = payloadFirmado;
      licencia.firmaLicencia = firmaLicencia;
      await this.licenciasRepository.save(licencia);
    }
    return {
      tenantId: empresaId,
      payloadFirmado,
      firmaLicencia,
      estado: licencia.estado,
      tipoLicencia: licencia.tipoLicencia,
      venceEn: licencia.venceEn,
    };
  }

  private validarVentanaFechas(iniciaEn: string, venceEn: string): void {
    const inicio = new Date(iniciaEn);
    const fin = new Date(venceEn);

    if (
      !Number.isFinite(inicio.getTime()) ||
      !Number.isFinite(fin.getTime()) ||
      fin.getTime() <= inicio.getTime()
    ) {
      throw new BadRequestException('La ventana de licencia es invalida');
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
