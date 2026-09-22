import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('formulario_campos')
export class FormularioCampo {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'formulario_version_id', type: 'uuid' })
  formularioVersionId: string;

  @Column({ name: 'clave', length: 80 })
  clave: string;

  @Column({ name: 'etiqueta', length: 160 })
  etiqueta: string;

  @Column({ name: 'tipo_campo', length: 30 })
  tipoCampo: string;

  @Column({ name: 'orden', type: 'int' })
  orden: number;

  @Column({ name: 'requerido', default: false })
  requerido: boolean;

  @Column({ name: 'configuracion', type: 'jsonb', nullable: true })
  configuracion?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
