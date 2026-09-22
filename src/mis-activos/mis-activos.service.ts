import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';
import { Activo } from '../activos/entities/activo.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { SuscripcionesLinea } from '../suscripciones-linea/entities/suscripciones-linea.entity';
import { PlanesTelefonico } from '../planes-telefonicos/entities/planes-telefonico.entity';
import { AsignacionBolsaTelecom } from '../asignaciones-bolsa-telecom/entities/asignaciones-bolsa-telecom.entity';
import { BolsaTelecom } from '../bolsas-telecom/entities/bolsas-telecom.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class MisActivosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(Asignacion)
    private readonly asignacionesRepository: Repository<Asignacion>,
    @InjectRepository(AsignacionRecurso)
    private readonly recursosRepository: Repository<AsignacionRecurso>,
    @InjectRepository(Activo)
    private readonly activosRepository: Repository<Activo>,
    @InjectRepository(LineaTelefonica)
    private readonly lineasRepository: Repository<LineaTelefonica>,
    @InjectRepository(SuscripcionesLinea)
    private readonly suscripcionesRepository: Repository<SuscripcionesLinea>,
    @InjectRepository(PlanesTelefonico)
    private readonly planesRepository: Repository<PlanesTelefonico>,
    @InjectRepository(AsignacionBolsaTelecom)
    private readonly asignacionesBolsaRepository: Repository<AsignacionBolsaTelecom>,
    @InjectRepository(BolsaTelecom)
    private readonly bolsasRepository: Repository<BolsaTelecom>,
  ) {}

  async findMine(user: AuthenticatedUser) {
    const usuario = await this.usuariosRepository.findOne({
      where: {
        id: user.userId,
        empresaId: user.empresaId,
        estado: 'activo',
        deletedAt: IsNull(),
      },
    });

    if (!usuario?.personaId) {
      return { items: [], total: 0 };
    }

    const asignaciones = await this.asignacionesRepository.find({
      where: {
        empresaId: user.empresaId,
        personaId: usuario.personaId,
        estado: 'entregada',
      },
      order: { fechaAsignacion: 'DESC' },
    });
    if (!asignaciones.length) {
      return { items: [], total: 0 };
    }

    const items: Array<Record<string, unknown>> = [];
    for (const asignacion of asignaciones) {
      const recursos = await this.recursosRepository.find({
        where: {
          empresaId: user.empresaId,
          asignacionId: asignacion.id,
          tipoRecurso: 'activo',
          estaActivo: true,
        },
      });
      for (const recurso of recursos) {
        if (!recurso.activoId) continue;
        const activo = await this.activosRepository.findOne({
          where: {
            id: recurso.activoId,
            empresaId: user.empresaId,
            estaActivo: true,
            deletedAt: IsNull(),
          },
        });
        if (!activo) continue;
        items.push({
          id: activo.id,
          codigoActivo: activo.codigoActivo,
          nombre: activo.nombre,
          marca: activo.marca,
          modelo: activo.modelo,
          serial: activo.serial,
          estado: activo.estado,
          estaActivo: activo.estaActivo,
          asignacion: {
            id: asignacion.id,
            estado: asignacion.estado,
            fechaAsignacion: asignacion.fechaAsignacion,
            fechaPrevistaDevolucion: asignacion.fechaPrevistaDevolucion,
          },
        });
      }
    }

    return { items, total: items.length };
  }

  async findMyLines(user: AuthenticatedUser) {
    const usuario = await this.usuariosRepository.findOne({
      where: {
        id: user.userId,
        empresaId: user.empresaId,
        estado: 'activo',
        deletedAt: IsNull(),
      },
    });
    if (!usuario?.personaId) return [];

    const asignaciones = await this.asignacionesRepository.find({
      where: {
        empresaId: user.empresaId,
        personaId: usuario.personaId,
        estado: 'entregada',
      },
      order: { fechaAsignacion: 'DESC' },
    });
    const lineas = [] as Array<Record<string, unknown>>;
    for (const asignacion of asignaciones) {
      const recursos = await this.recursosRepository.find({
        where: {
          empresaId: user.empresaId,
          asignacionId: asignacion.id,
          tipoRecurso: 'linea',
          estaActivo: true,
        },
      });
      for (const recurso of recursos) {
        if (!recurso.lineaTelefonicaId) continue;
        const linea = await this.lineasRepository.findOne({
          where: {
            id: recurso.lineaTelefonicaId,
            empresaId: user.empresaId,
            estaActiva: true,
          },
        });
        if (!linea) continue;
        const suscripcion = await this.suscripcionesRepository.findOne({
          where: {
            empresaId: user.empresaId,
            lineaTelefonicaId: linea.id,
            estado: 'activa',
          },
        });
        const plan = suscripcion
          ? await this.planesRepository.findOne({
              where: {
                id: suscripcion.planTelefonicoId,
                empresaId: user.empresaId,
                estaActivo: true,
              },
            })
          : null;
        const asignaciones = await this.asignacionesBolsaRepository.find({
          where: {
            empresaId: user.empresaId,
            personaId: usuario.personaId,
            lineaTelefonicaId: linea.id,
            estado: 'activa',
          },
        });
        const bolsas = [] as Array<Record<string, unknown>>;
        for (const asignacionBolsa of asignaciones) {
          const bolsa = await this.bolsasRepository.findOne({
            where: {
              id: asignacionBolsa.bolsaTelecomId,
              empresaId: user.empresaId,
              estado: 'activa',
            },
          });
          if (bolsa)
            bolsas.push({
              id: bolsa.id,
              tipoBolsa: bolsa.tipoBolsa,
              unidad: asignacionBolsa.unidad,
              cantidad: asignacionBolsa.cantidad,
              venceEn: bolsa.venceEn,
            });
        }
        lineas.push({
          id: linea.id,
          numero: linea.numero,
          tipoLinea: linea.tipoLinea,
          estado: linea.estado,
          estaActiva: linea.estaActiva,
          plan: plan
            ? {
                id: plan.id,
                nombre: plan.nombre,
                incluyeMinutos: plan.incluyeMinutos,
                incluyeDatos: plan.incluyeDatos,
                incluyeSms: plan.incluyeSms,
              }
            : null,
          bolsas,
        });
      }
    }
    return lineas;
  }
}
