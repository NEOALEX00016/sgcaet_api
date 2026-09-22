import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity('ciclos_telecom')
export class CicloTelecom {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'pool_telecom_id', type: 'uuid' }) poolTelecomId: string;
  @Column({ name: 'inicia_en', type: 'timestamptz' }) iniciaEn: Date;
  @Column({ name: 'termina_en', type: 'timestamptz' }) terminaEn: Date;
  @Column({ name: 'estado', length: 20, default: 'abierto' }) estado: string;
  @Column({ name: 'cerrado_en', type: 'timestamptz', nullable: true }) cerradoEn?: Date;
  @Column({ name: 'rollover_aplicado', type: 'jsonb', nullable: true }) rolloverAplicado?: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
