import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
@Entity('recargas_telecom')
export class RecargaTelecom {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'linea_telefonica_id', type: 'uuid' }) lineaTelefonicaId: string;
  @Column({ name: 'persona_id', type: 'uuid', nullable: true }) personaId?: string;
  @Column({ name: 'politica_recarga_id', type: 'uuid', nullable: true }) politicaRecargaId?: string;
  @Column({ name: 'capacidad_pool_id', type: 'uuid', nullable: true }) capacidadPoolId?: string;
  @Column({ name: 'tipo_capacidad', length: 20 }) tipoCapacidad: string;
  @Column({ name: 'cantidad', type: 'numeric', precision: 18, scale: 4 }) cantidad: string;
  @Column({ name: 'unidad', length: 20 }) unidad: string;
  @Column({ name: 'estado', length: 20, default: 'solicitada' }) estado: string;
  @Column({ name: 'requiere_aprobacion', default: true }) requiereAprobacion: boolean;
  @Column({ name: 'clave_idempotencia', length: 120 }) claveIdempotencia: string;
  @Column({ name: 'solicitado_por', type: 'uuid' }) solicitadoPor: string;
  @Column({ name: 'aprobado_por', type: 'uuid', nullable: true }) aprobadoPor?: string;
  @Column({ name: 'aprobada_en', type: 'timestamptz', nullable: true }) aprobadaEn?: Date;
  @Column({ name: 'aplicada_en', type: 'timestamptz', nullable: true }) aplicadaEn?: Date;
  @Column({ name: 'motivo', type: 'text', nullable: true }) motivo?: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
