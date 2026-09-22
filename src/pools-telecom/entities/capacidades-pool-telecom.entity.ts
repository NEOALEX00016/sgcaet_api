import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
@Entity('capacidades_pool_telecom')
export class CapacidadPoolTelecom {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'pool_telecom_id', type: 'uuid' }) poolTelecomId: string;
  @Column({ name: 'tipo_capacidad', length: 20 }) tipoCapacidad: string;
  @Column({ name: 'unidad', length: 20 }) unidad: string;
  @Column({ name: 'cantidad_contratada', type: 'numeric', precision: 18, scale: 4 }) cantidadContratada: string;
  @Column({ name: 'cantidad_rollover_maxima', type: 'numeric', precision: 18, scale: 4, nullable: true }) cantidadRolloverMaxima?: string;
  @Column({ name: 'rollover_habilitado', default: false }) rolloverHabilitado: boolean;
  @Column({ name: 'cantidad_rollover_actual', type: 'numeric', precision: 18, scale: 4, default: 0 }) cantidadRolloverActual: string;
  @Column({ name: 'cantidad_asignada', type: 'numeric', precision: 18, scale: 4, default: 0 }) cantidadAsignada: string;
  @Column({ name: 'cantidad_consumida', type: 'numeric', precision: 18, scale: 4, default: 0 }) cantidadConsumida: string;
  @Column({ name: 'esta_activa', default: true }) estaActiva: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
