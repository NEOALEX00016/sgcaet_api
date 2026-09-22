import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('programaciones_mantenimiento')
export class ProgramacionMantenimiento {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'activo_id', type: 'uuid' })
  activoId: string;

  @Column({ name: 'formulario_id', type: 'uuid', nullable: true })
  formularioId?: string | null;

  @Column({ name: 'nombre', length: 140 })
  nombre: string;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion?: string | null;

  @Column({ name: 'frecuencia_dias', type: 'int' })
  frecuenciaDias: number;

  @Column({ name: 'proxima_fecha', type: 'date' })
  proximaFecha: string;

  @Column({ name: 'ultima_ejecucion_en', type: 'timestamptz', nullable: true })
  ultimaEjecucionEn?: Date | null;

  @Column({ name: 'anticipacion_dias', type: 'int', default: 15 })
  anticipacionDias: number;

  @Column({ name: 'esta_activa', default: true })
  estaActiva: boolean;

  @Column({ name: 'ultima_reparacion_id', type: 'uuid', nullable: true })
  ultimaReparacionId?: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
