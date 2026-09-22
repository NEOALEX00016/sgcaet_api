import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('formulario_reglas')
export class FormularioRegla {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'formulario_version_id', type: 'uuid' })
  formularioVersionId: string;

  @Column({ name: 'campo_origen_id', type: 'uuid' })
  campoOrigenId: string;

  @Column({ name: 'operador', length: 30 })
  operador: string;

  @Column({ name: 'valor_esperado', type: 'text', nullable: true })
  valorEsperado?: string;

  @Column({ name: 'accion', length: 30 })
  accion: string;

  @Column({ name: 'campo_destino_id', type: 'uuid' })
  campoDestinoId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
