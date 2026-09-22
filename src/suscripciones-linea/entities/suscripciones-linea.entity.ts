import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('suscripciones_linea')
export class SuscripcionesLinea {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'linea_telefonica_id', type: 'uuid' })
  lineaTelefonicaId: string;

  @Column({ name: 'plan_telefonico_id', type: 'uuid', nullable: true })
  planTelefonicoId?: string;

  @Column({ name: 'plan_comercial_telecom_id', type: 'uuid', nullable: true })
  planComercialTelecomId?: string;

  @Column({ name: 'inicia_en', type: 'timestamptz' })
  iniciaEn: Date;

  @Column({ name: 'vence_en', type: 'timestamptz', nullable: true })
  venceEn?: Date;

  @Column({ name: 'estado', length: 20, default: 'activa' })
  estado: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
