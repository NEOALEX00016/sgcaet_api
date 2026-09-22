import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('outbox_eventos_integracion')
export class OutboxEventoIntegracion {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'aggregate_type', length: 80 })
  aggregateType: string;

  @Column({ name: 'aggregate_id', type: 'uuid' })
  aggregateId: string;

  @Column({ name: 'event_type', length: 80 })
  eventType: string;

  @Column({ name: 'idempotency_key', length: 160 })
  idempotencyKey: string;

  @Column({ name: 'payload_json', type: 'jsonb' })
  payloadJson: Record<string, unknown>;

  @Column({ name: 'estado', length: 20, default: 'pendiente' })
  estado: string;

  @Column({ name: 'intentos', type: 'int', default: 0 })
  intentos: number;

  @Column({ name: 'max_intentos', type: 'int', default: 10 })
  maxIntentos: number;

  @Column({ name: 'siguiente_intento_en', type: 'timestamptz', nullable: true })
  siguienteIntentoEn?: Date | null;

  @Column({ name: 'procesado_en', type: 'timestamptz', nullable: true })
  procesadoEn?: Date | null;

  @Column({ name: 'ultimo_error', type: 'text', nullable: true })
  ultimoError?: string | null;

  @Column({ name: 'locked_by', type: 'varchar', length: 120, nullable: true })
  lockedBy?: string | null;

  @Column({ name: 'locked_at', type: 'timestamptz', nullable: true })
  lockedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
