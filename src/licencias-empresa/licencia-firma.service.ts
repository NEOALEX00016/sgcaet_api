import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { LicenciaEmpresa } from './entities/licencias-empresa.entity';

@Injectable()
export class LicenciaFirmaService {
  constructor(private readonly configService: ConfigService) {}

  validar(licencia: LicenciaEmpresa): boolean {
    if (!licencia.payloadFirmado || !licencia.firmaLicencia) return this.permiteLicenciaLocalSinFirma();
    try {
      const expected = this.firmar(licencia.payloadFirmado);
      const actual = Buffer.from(licencia.firmaLicencia, 'base64url');
      const wanted = Buffer.from(expected, 'base64url');
      return actual.length === wanted.length && timingSafeEqual(actual, wanted);
    } catch {
      return false;
    }
  }

  enforcementEnabled(): boolean {
    const configured = this.configService.get<string>('LICENSE_ENFORCEMENT_ENABLED');
    return configured === undefined || configured.toLowerCase() !== 'false';
  }

  permiteLicenciaLocalSinFirma(): boolean {
    return !this.enforcementEnabled();
  }

  firmar(payload: string): string {
    const key = this.configService.get<string>('LICENSE_SIGNING_SECRET');
    if (!key) {
      throw new BadRequestException('Firma de licencia no disponible');
    }
    return createHmac('sha256', key).update(payload, 'utf8').digest('base64url');
  }

  crearPayload(licencia: LicenciaEmpresa) {
    return JSON.stringify({
      empresaId: licencia.empresaId,
      licenciaId: licencia.id,
      tipoLicencia: licencia.tipoLicencia,
      estado: licencia.estado,
      iniciaEn: licencia.iniciaEn.toISOString(),
      venceEn: licencia.venceEn.toISOString(),
      graciaHasta: licencia.graciaHasta?.toISOString() ?? null,
      funcionalidades: licencia.funcionalidades ?? {},
      limiteUsuarios: licencia.limiteUsuarios ?? null,
      limiteActivos: licencia.limiteActivos ?? null,
      limiteLineas: licencia.limiteLineas ?? null,
    });
  }
}
