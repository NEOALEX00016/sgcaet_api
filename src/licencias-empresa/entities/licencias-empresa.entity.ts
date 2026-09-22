import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Empresa } from '../../empresas/entities/empresa.entity';

@Entity('licencias_empresa')
export class LicenciaEmpresa {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @ManyToOne(() => Empresa)
  @JoinColumn({ name: 'empresa_id' })
  empresa: Empresa;

  @Column({ name: 'tipo_licencia', length: 20 })
  tipoLicencia: string;

  @Column({ name: 'estado', length: 20 })
  estado: string;

  @Column({ name: 'inicia_en', type: 'timestamptz' })
  iniciaEn: Date;

  @Column({ name: 'vence_en', type: 'timestamptz' })
  venceEn: Date;

  @Column({ name: 'gracia_hasta', type: 'timestamptz', nullable: true })
  graciaHasta?: Date;

  @Column({ name: 'modo_solo_lectura_al_vencer', default: true })
  modoSoloLecturaAlVencer: boolean;

  @Column({ name: 'limite_usuarios', type: 'int', nullable: true })
  limiteUsuarios?: number;

  @Column({ name: 'limite_activos', type: 'int', nullable: true })
  limiteActivos?: number;

  @Column({ name: 'limite_lineas', type: 'int', nullable: true })
  limiteLineas?: number;

  @Column({ name: 'funcionalidades', type: 'jsonb', nullable: true })
  funcionalidades?: Record<string, unknown>;

  @Column({ name: 'payload_firmado', type: 'text', nullable: true })
  payloadFirmado?: string;

  @Column({ name: 'firma_licencia', type: 'text', nullable: true })
  firmaLicencia?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
