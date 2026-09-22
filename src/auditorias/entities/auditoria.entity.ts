import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('auditorias')
export class Auditoria {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'codigo', length: 50 })
  codigo: string;

  @Column({ name: 'tipo_auditoria', length: 30 })
  tipoAuditoria: string;

  @Column({ name: 'dominio', length: 30, default: 'equipos' })
  dominio: string;

  @Column({ name: 'alcance_tipo', length: 20, default: 'general' })
  alcanceTipo: 'general' | 'categoria' | 'tipo';

  @Column({ name: 'alcance_id', type: 'uuid', nullable: true })
  alcanceId?: string;

  @Column({ name: 'periodicidad_dias', type: 'int', nullable: true })
  periodicidadDias?: number;

  @Column({ name: 'fecha_programada', type: 'date', nullable: true })
  fechaProgramada?: string;

  @Column({ name: 'fecha_inicio', type: 'timestamptz', nullable: true })
  fechaInicio?: Date;

  @Column({ name: 'fecha_cierre', type: 'timestamptz', nullable: true })
  fechaCierre?: Date;

  @Column({ name: 'estado', length: 20, default: 'programada' })
  estado: string;

  @Column({ name: 'creada_por', type: 'uuid', nullable: true })
  creadaPor?: string;

  @Column({ name: 'finalizada_por', type: 'uuid', nullable: true })
  finalizadaPor?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
