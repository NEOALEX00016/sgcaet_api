import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('bolsas_telecom')
export class BolsaTelecom {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'linea_telefonica_id', type: 'uuid', nullable: true })
  lineaTelefonicaId?: string;

  @Column({ name: 'alcance', length: 20 })
  alcance: string;

  @Column({ name: 'tipo_bolsa', length: 20 })
  tipoBolsa: string;

  @Column({ name: 'unidad', length: 20 })
  unidad: string;

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
