import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('configuracion_solicitudes_tenant')
export class ConfiguracionSolicitudes {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'empresa_id', type: 'uuid', unique: true }) empresaId: string;
  @Column({ name: 'permitir_equipo', default: true }) permitirEquipo: boolean;
  @Column({ name: 'permitir_prestamo_actividad', default: true })
  permitirPrestamoActividad: boolean;
  @Column({ name: 'permitir_prestamo_permanente', default: true })
  permitirPrestamoPermanente: boolean;
  @Column({ name: 'permitir_reparacion_activo', default: true })
  permitirReparacionActivo: boolean;
  @Column({ name: 'permitir_telecom', default: true }) permitirTelecom: boolean;
  @Column({ name: 'permitir_recarga_minutos', default: true })
  permitirRecargaMinutos: boolean;
  @Column({ name: 'responsable_equipo', length: 20, default: 'equipos' })
  responsableEquipo: 'equipos' | 'mesa_ayuda';
  @Column({ name: 'mensaje_portal', type: 'text' }) mensajePortal: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
