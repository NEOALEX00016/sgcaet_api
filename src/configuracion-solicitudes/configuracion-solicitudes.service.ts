import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracionSolicitudes } from './entities/configuracion-solicitudes.entity';
import { UpdateConfiguracionSolicitudesDto } from './dto/update-configuracion-solicitudes.dto';
import { IntegracionMesaAyuda } from '../integraciones-mesa-ayuda/entities/integracion-mesa-ayuda.entity';

const defaults = {
  permitirEquipo: true,
  permitirPrestamoActividad: true,
  permitirPrestamoPermanente: true,
  permitirReparacionActivo: true,
  permitirTelecom: true,
  permitirRecargaMinutos: true,
  responsableEquipo: 'equipos' as const,
  mensajePortal:
    'Selecciona el tipo de solicitud que necesitas y te indicaremos el siguiente paso.',
};

@Injectable()
export class ConfiguracionSolicitudesService {
  constructor(
    @InjectRepository(ConfiguracionSolicitudes)
    private readonly repository: Repository<ConfiguracionSolicitudes>,
    @InjectRepository(IntegracionMesaAyuda)
    private readonly integracionesRepository: Repository<IntegracionMesaAyuda>,
  ) {}
  async get(empresaId: string) {
    return (
      (await this.repository.findOne({ where: { empresaId } })) ?? {
        empresaId,
        ...defaults,
      }
    );
  }
  async update(empresaId: string, dto: UpdateConfiguracionSolicitudesDto) {
    if (dto.responsableEquipo === 'mesa_ayuda') {
      const activeHelpdesk = await this.integracionesRepository.findOne({
        where: { empresaId, activo: true },
      });
      if (!activeHelpdesk) {
        throw new BadRequestException(
          'No se puede asignar Mesa de ayuda como responsable sin una integración activa.',
        );
      }
    }

    const current = await this.repository.findOne({ where: { empresaId } });
    return this.repository.save(
      current
        ? this.repository.merge(current, dto)
        : this.repository.create({ empresaId, ...defaults, ...dto }),
    );
  }
  async assertAllowed(empresaId: string, recursoTipo: string) {
    const config = await this.get(empresaId);
    const allowed: Record<string, boolean> = {
      laptop: config.permitirEquipo,
      monitor: config.permitirEquipo,
      proyector: config.permitirEquipo,
      prestamo_actividad: config.permitirPrestamoActividad,
      prestamo_permanente: config.permitirPrestamoPermanente,
      reparacion_activo: config.permitirReparacionActivo,
      paquete_datos: config.permitirTelecom,
      sms: config.permitirTelecom,
      telecom: config.permitirTelecom,
      recarga_minutos: config.permitirRecargaMinutos,
    };
    if (allowed[recursoTipo] === false)
      throw new BadRequestException(
        `El tenant no permite solicitudes de tipo ${recursoTipo}`,
      );
  }
}
