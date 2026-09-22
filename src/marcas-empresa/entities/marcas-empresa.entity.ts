import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
@Entity('marcas_empresa')
export class MarcasEmpresa {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'logo_url', type: 'text', nullable: true }) logoUrl?: string;
  @Column({ name: 'logo_oscuro_url', type: 'text', nullable: true })
  logoOscuroUrl?: string;
  @Column({ name: 'favicon_url', type: 'text', nullable: true })
  faviconUrl?: string;
  @Column({ name: 'color_primario', length: 20, nullable: true })
  colorPrimario?: string;
  @Column({ name: 'color_secundario', length: 20, nullable: true })
  colorSecundario?: string;
  @Column({ name: 'color_acento', length: 20, nullable: true })
  colorAcento?: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
