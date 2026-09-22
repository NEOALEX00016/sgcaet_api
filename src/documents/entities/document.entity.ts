import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('documents')
export class DocumentEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'original_name', length: 255 })
  originalName: string;

  @Column({ name: 'entidad_relacionada', length: 50, nullable: true })
  entidadRelacionada?: string;

  @Column({ name: 'entidad_relacionada_id', type: 'uuid', nullable: true })
  entidadRelacionadaId?: string;

  @Column({ name: 'stored_name', length: 255 })
  storedName: string;

  @Column({ name: 'mime_type', length: 120 })
  mimeType: string;

  @Column({ name: 'extension', length: 16 })
  extension: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: string;

  @Column({ name: 'storage_path', type: 'text' })
  storagePath: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
