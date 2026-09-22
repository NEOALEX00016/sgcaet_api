import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('auditoria_detalles')
export class AuditoriaDetalle {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'auditoria_id', type: 'uuid' })
  auditoriaId: string;

  @Column({ name: 'activo_id', type: 'uuid' })
  activoId: string;

  @Column({ name: 'dominio', length: 30, default: 'equipos' })
  dominio: string;

  @Column({ name: 'persona_reportada_id', type: 'uuid', nullable: true })
  personaReportadaId?: string;

  @Column({ name: 'resultado', length: 30 })
  resultado: string;

  @Column({ name: 'condicion_reportada', type: 'text', nullable: true })
  condicionReportada?: string;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones?: string;

  @Column({ name: 'firmado_por', type: 'uuid', nullable: true })
  firmadoPor?: string;

  @Column({ name: 'confirmado_en', type: 'timestamptz' })
  confirmadoEn: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
