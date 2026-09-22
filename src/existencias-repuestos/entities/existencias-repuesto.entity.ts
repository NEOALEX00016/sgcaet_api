import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('existencias_repuestos')
export class ExistenciaRepuesto {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'pieza_repuesto_id', type: 'uuid' }) piezaRepuestoId: string;
  @Column({ name: 'cantidad_disponible', type: 'numeric', precision: 14, scale: 4, default: 0 }) cantidadDisponible: string;
  @Column({ name: 'cantidad_reservada', type: 'numeric', precision: 14, scale: 4, default: 0 }) cantidadReservada: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
