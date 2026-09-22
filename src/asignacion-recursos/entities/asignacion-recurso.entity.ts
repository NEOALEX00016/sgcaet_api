import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('asignacion_recursos')
export class AsignacionRecurso {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'asignacion_id', type: 'uuid' })
  asignacionId: string;

  @Column({ name: 'tipo_recurso', length: 20 })
  tipoRecurso: string;

  @Column({ name: 'activo_id', type: 'uuid', nullable: true })
  activoId?: string;

  @Column({ name: 'linea_telefonica_id', type: 'uuid', nullable: true })
  lineaTelefonicaId?: string;

  @Column({ name: 'esta_activo', default: true })
  estaActivo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
