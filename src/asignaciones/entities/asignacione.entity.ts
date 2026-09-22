import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('asignaciones')
export class Asignacion {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'persona_id', type: 'uuid', nullable: true })
  personaId?: string;

  @Column({ name: 'departamento_id', type: 'uuid', nullable: true })
  departamentoId?: string;

  @Column({ name: 'ubicacion_id', type: 'uuid', nullable: true })
  ubicacionId?: string;

  @Column({ name: 'fecha_asignacion', type: 'timestamptz' })
  fechaAsignacion: Date;

  @Column({
    name: 'fecha_prevista_devolucion',
    type: 'timestamptz',
    nullable: true,
  })
  fechaPrevistaDevolucion?: Date;

  @Column({
    name: 'fecha_real_devolucion',
    type: 'timestamptz',
    nullable: true,
  })
  fechaRealDevolucion?: Date;

  @Column({ name: 'motivo', type: 'text', nullable: true })
  motivo?: string;

  @Column({ name: 'autorizado_por', type: 'uuid', nullable: true })
  autorizadoPor?: string;

  @Column({ name: 'entregado_por', type: 'uuid', nullable: true })
  entregadoPor?: string;

  @Column({ name: 'estado', length: 30, default: 'borrador' })
  estado: string;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones?: string;

  @Column({ name: 'formulario_version_id', type: 'uuid', nullable: true })
  formularioVersionId?: string;

  @Column({ name: 'tipo_asignacion_id', type: 'uuid', nullable: true })
  tipoAsignacionId?: string;

  @Column({ name: 'solicitud_origen_id', type: 'uuid', nullable: true })
  solicitudOrigenId?: string;

  @Column({ name: 'firma_url', type: 'text', nullable: true })
  firmaUrl?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
