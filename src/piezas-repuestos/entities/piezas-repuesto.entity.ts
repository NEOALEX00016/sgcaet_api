import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('piezas_repuestos')
export class PiezaRepuesto {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'especificacion_tipo_activo_id', type: 'uuid' }) especificacionTipoActivoId: string;
  @Column({ name: 'codigo', length: 60 }) codigo: string;
  @Column({ name: 'nombre_comercial', length: 180 }) nombreComercial: string;
  @Column({ name: 'fabricante', length: 120, nullable: true }) fabricante?: string;
  @Column({ name: 'modelo', length: 120, nullable: true }) modelo?: string;
  @Column({ name: 'numero_parte', length: 120, nullable: true }) numeroParte?: string;
  @Column({ name: 'capacidad', type: 'numeric', precision: 14, scale: 4, nullable: true }) capacidad?: string;
  @Column({ name: 'unidad', length: 30, nullable: true }) unidad?: string;
  @Column({ name: 'es_serializado', default: false }) esSerializado: boolean;
  @Column({ name: 'stock_minimo', type: 'numeric', precision: 14, scale: 4, default: 0 }) stockMinimo: string;
  @Column({ name: 'costo_referencial', type: 'numeric', precision: 14, scale: 2, nullable: true }) costoReferencial?: string;
  @Column({ name: 'moneda', type: 'char', length: 3, nullable: true }) moneda?: string;
  @Column({ name: 'esta_activa', default: true }) estaActiva: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
