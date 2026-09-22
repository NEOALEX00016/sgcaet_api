import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('acta_asignacion_recursos')
export class ActaAsignacionRecurso {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'acta_asignacion_id', type: 'uuid' })
  actaAsignacionId: string;

  @Column({ name: 'asignacion_recurso_id', type: 'uuid' })
  asignacionRecursoId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
