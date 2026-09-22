import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('formulario_versiones')
export class FormularioVersione {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'formulario_id', type: 'uuid' })
  formularioId: string;

  @Column({ name: 'version_numero', type: 'int' })
  versionNumero: number;

  @Column({ name: 'estado', length: 20, default: 'borrador' })
  estado: string;

  @Column({ name: 'plantilla_html', type: 'text', nullable: true })
  plantillaHtml?: string;

  @Column({ name: 'publicado_en', type: 'timestamptz', nullable: true })
  publicadoEn?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
