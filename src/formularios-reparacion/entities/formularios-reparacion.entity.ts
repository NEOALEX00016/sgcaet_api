import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('formularios_reparacion')
export class FormularioReparacion {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'reparacion_activo_id', type: 'uuid' })
  reparacionActivoId: string;
  @Column({ name: 'etapa', length: 10 }) etapa: string;
  @Column({ name: 'formulario_version_id', type: 'uuid' })
  formularioVersionId: string;
  @Column({ name: 'estado', length: 20, default: 'pendiente' }) estado: string;
  @Column({ name: 'formulario_respuesta_id', type: 'uuid', nullable: true })
  formularioRespuestaId?: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
