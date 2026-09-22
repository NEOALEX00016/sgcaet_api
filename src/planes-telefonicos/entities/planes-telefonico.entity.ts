import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('planes_telefonicos')
export class PlanesTelefonico {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'operadora_id', type: 'uuid' })
  operadoraId: string;

  @Column({ name: 'codigo', length: 50 })
  codigo: string;

  @Column({ name: 'nombre', length: 120 })
  nombre: string;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion?: string;

  @Column({
    name: 'costo_mensual',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  costoMensual?: string;

  @Column({ name: 'moneda', length: 3, default: 'DOP' })
  moneda: string;

  @Column({ name: 'incluye_datos', default: false })
  incluyeDatos: boolean;

  @Column({ name: 'incluye_minutos', default: false })
  incluyeMinutos: boolean;

  @Column({ name: 'incluye_sms', default: false })
  incluyeSms: boolean;

  @Column({ name: 'esta_activo', default: true })
  estaActivo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
