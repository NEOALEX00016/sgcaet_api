import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type TipoMovimientoRepuesto = 'entrada' | 'reserva' | 'liberacion' | 'consumo' | 'devolucion' | 'ajuste_pos' | 'ajuste_neg';

@Entity('movimientos_repuestos')
export class MovimientoRepuesto {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'pieza_repuesto_id', type: 'uuid' }) piezaRepuestoId: string;
  @Column({ name: 'unidad_repuesto_id', type: 'uuid', nullable: true }) unidadRepuestoId?: string;
  @Column({ name: 'reparacion_activo_id', type: 'uuid', nullable: true }) reparacionActivoId?: string;
  @Column({ name: 'activo_id', type: 'uuid', nullable: true }) activoId?: string;
  @Column({ name: 'tipo_movimiento', length: 20 }) tipoMovimiento: TipoMovimientoRepuesto;
  @Column({ name: 'cantidad', type: 'numeric', precision: 14, scale: 4 }) cantidad: string;
  @Column({ name: 'saldo_anterior', type: 'numeric', precision: 14, scale: 4, nullable: true }) saldoAnterior?: string;
  @Column({ name: 'saldo_nuevo', type: 'numeric', precision: 14, scale: 4, nullable: true }) saldoNuevo?: string;
  @Column({ name: 'motivo', type: 'text', nullable: true }) motivo?: string;
  @Column({ name: 'referencia', length: 180, nullable: true }) referencia?: string;
  @Column({ name: 'creado_por', type: 'uuid' }) creadoPor: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
