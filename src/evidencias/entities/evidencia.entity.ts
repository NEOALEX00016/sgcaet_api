import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('evidencias')
export class Evidencia {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'entidad_relacionada', length: 50 })
  entidadRelacionada: string;

  @Column({ name: 'entidad_relacionada_id', type: 'uuid' })
  entidadRelacionadaId: string;

  @Column({ name: 'tipo_evidencia', length: 20 })
  tipoEvidencia: string;

  @Column({ name: 'nombre_archivo', length: 255 })
  nombreArchivo: string;

  @Column({ name: 'url_archivo', type: 'text' })
  urlArchivo: string;

  @Column({ name: 'mime_type', length: 120, nullable: true })
  mimeType?: string;

  @Column({ name: 'tamano_bytes', type: 'bigint', nullable: true })
  tamanoBytes?: string;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ name: 'creado_por', type: 'uuid', nullable: true })
  creadoPor?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
