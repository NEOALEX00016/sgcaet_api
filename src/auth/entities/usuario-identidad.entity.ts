import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('usuario_identidades')
export class UsuarioIdentidad {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'usuario_id', type: 'uuid' })
  usuarioId: string;

  @Column({ name: 'proveedor', length: 20 })
  proveedor: 'microsoft' | 'google';

  @Column({ name: 'subject_externo', length: 255 })
  subjectExterno: string;

  @Column({ name: 'tenant_externo', length: 255, nullable: true })
  tenantExterno?: string;

  @Column({ name: 'correo_verificado', length: 180, nullable: true })
  correoVerificado?: string;

  @Column({ name: 'ultimo_login_en', type: 'timestamptz', nullable: true })
  ultimoLoginEn?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
