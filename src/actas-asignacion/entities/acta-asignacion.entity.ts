import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('actas_asignacion')
export class ActaAsignacion {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'asignacion_id', type: 'uuid' })
  asignacionId: string;

  @Column({ name: 'formulario_version_id', type: 'uuid' })
  formularioVersionId: string;

  @Column({ name: 'dominio', length: 30, default: 'equipos' })
  dominio: string;

  @Column({ name: 'documento_id', type: 'uuid', nullable: true })
  documentoId?: string;

  @Column({ name: 'estado', length: 30, default: 'pendiente_firma' })
  estado: string;

  @Column({ name: 'firmada_en', type: 'timestamptz', nullable: true })
  firmadaEn?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
