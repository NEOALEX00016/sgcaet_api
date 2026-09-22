import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
@Entity('dominios_empresa')
export class DominiosEmpresa {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ length: 255 }) hostname: string;
  @Column({ name: 'es_principal', default: false }) esPrincipal: boolean;
  @Column({ name: 'estado_verificacion', length: 20, default: 'pendiente' })
  estadoVerificacion: string;
  @Column({ name: 'token_verificacion', length: 120, nullable: true })
  tokenVerificacion?: string;
  @Column({ name: 'verificado_en', type: 'timestamptz', nullable: true })
  verificadoEn?: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
