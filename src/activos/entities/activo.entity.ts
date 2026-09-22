import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('activos')
export class Activo {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'tipo_activo_id', type: 'uuid' })
  tipoActivoId: string;

  @Column({ name: 'ubicacion_actual_id', type: 'uuid', nullable: true })
  ubicacionActualId?: string;

  @Column({ name: 'codigo_activo', length: 60 })
  codigoActivo: string;

  @Column({ name: 'nombre', length: 120 })
  nombre: string;

  @Column({ name: 'marca', length: 120, nullable: true })
  marca?: string;

  @Column({ name: 'modelo', length: 120, nullable: true })
  modelo?: string;

  @Column({ name: 'serial', length: 120, nullable: true })
  serial?: string;

  @Column({ name: 'estado', length: 30, default: 'registrado' })
  estado: string;

  @Column({ name: 'fecha_compra', type: 'date', nullable: true })
  fechaCompra?: string;

  @Column({
    name: 'costo_compra',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  costoCompra?: string;

  @Column({ name: 'moneda', type: 'char', length: 3, nullable: true })
  moneda?: string;

  @Column({ name: 'esta_activo', default: true })
  estaActivo: boolean;

  @Column({ name: 'fecha_descargo', type: 'date', nullable: true })
  fechaDescargo?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
