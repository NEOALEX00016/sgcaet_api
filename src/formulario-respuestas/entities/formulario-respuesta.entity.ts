import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('formulario_respuestas')
export class FormularioRespuesta {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'formulario_version_id', type: 'uuid' })
  formularioVersionId: string;

  @Column({ name: 'entidad_relacionada', length: 50 })
  entidadRelacionada: string;

  @Column({ name: 'entidad_relacionada_id', type: 'uuid' })
  entidadRelacionadaId: string;

  @Column({ name: 'respondido_por', type: 'uuid', nullable: true })
  respondidoPor?: string;

  @Column({ name: 'respondido_en', type: 'timestamptz' })
  respondidoEn: Date;

  @Column({ name: 'firma_url', type: 'text', nullable: true })
  firmaUrl?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
