import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type EstadoUnidadRepuesto = 'disponible' | 'reservada' | 'instalada' | 'defectuosa' | 'baja';

@Entity('unidades_repuestos')
export class UnidadRepuesto {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'pieza_repuesto_id', type: 'uuid' }) piezaRepuestoId: string;
  @Column({ name: 'numero_serie', length: 160 }) numeroSerie: string;
  @Column({ name: 'estado', length: 20, default: 'disponible' }) estado: EstadoUnidadRepuesto;
  @Column({ name: 'reparacion_reserva_id', type: 'uuid', nullable: true }) reparacionReservaId?: string;
  @Column({ name: 'activo_instalado_id', type: 'uuid', nullable: true }) activoInstaladoId?: string;
  @Column({ name: 'costo_entrada', type: 'numeric', precision: 14, scale: 2, nullable: true }) costoEntrada?: string;
  @Column({ name: 'moneda', type: 'char', length: 3, nullable: true }) moneda?: string;
  @Column({ name: 'garantia_hasta', type: 'date', nullable: true }) garantiaHasta?: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
