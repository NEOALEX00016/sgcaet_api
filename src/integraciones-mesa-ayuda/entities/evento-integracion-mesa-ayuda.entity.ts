import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('eventos_integracion_mesa_ayuda')
export class EventoIntegracionMesaAyuda {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'solicitud_id', type: 'uuid' }) solicitudId: string;
  @Column({ name: 'integracion_id', type: 'uuid' }) integracionId: string;
  @Column({ name: 'idempotency_key', length: 220 }) idempotencyKey: string;
  @Column({ name: 'estado', length: 20, default: 'pendiente' }) estado: string;
  @Column({ name: 'intentos', type: 'int', default: 0 }) intentos: number;
  @Column({ name: 'referencia_externa', length: 160, nullable: true })
  referenciaExterna?: string;
  @Column({ name: 'respuesta_externa', type: 'jsonb', nullable: true })
  respuestaExterna?: Record<string, unknown>;
  @Column({ name: 'ultimo_error', type: 'text', nullable: true })
  ultimoError?: string;
  @Column({ name: 'siguiente_intento_en', type: 'timestamptz', nullable: true })
  siguienteIntentoEn?: Date;
  @Column({ name: 'enviado_en', type: 'timestamptz', nullable: true })
  enviadoEn?: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
