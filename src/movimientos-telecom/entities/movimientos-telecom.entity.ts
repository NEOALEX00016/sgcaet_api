import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('movimientos_telecom')
export class MovimientosTelecom {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'linea_telefonica_id', type: 'uuid', nullable: true })
  lineaTelefonicaId?: string;

  @Column({ name: 'bolsa_telecom_id', type: 'uuid', nullable: true })
  bolsaTelecomId?: string;

  @Column({ name: 'tipo_movimiento', length: 30 })
  tipoMovimiento: string;

  @Column({ name: 'cantidad', type: 'numeric', precision: 18, scale: 4 })
  cantidad: string;

  @Column({ name: 'unidad', length: 20 })
  unidad: string;

  @Column({
    name: 'costo',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  costo?: string;

  @Column({ name: 'moneda', type: 'char', length: 3, nullable: true })
  moneda?: string;

  @Column({ name: 'clave_idempotencia', length: 120, nullable: true })
  claveIdempotencia?: string;

  @Column({ name: 'referencia_externa', length: 120, nullable: true })
  referenciaExterna?: string;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion?: string;

  @Column({ name: 'ocurrido_en', type: 'timestamptz' })
  ocurridoEn: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
