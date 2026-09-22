import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('politicas_formulario_asignacion')
export class PoliticaFormularioAsignacion {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'tipo_asignacion_id', type: 'uuid' })
  tipoAsignacionId: string;

  @Column({ name: 'dominio_id', type: 'uuid', nullable: true })
  dominioId?: string;

  @Column({ name: 'categoria_id', type: 'uuid', nullable: true })
  categoriaId?: string;

  @Column({ name: 'formulario_id', type: 'uuid' })
  formularioId: string;

  @Column({ name: 'esta_activa', default: true })
  estaActiva: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
