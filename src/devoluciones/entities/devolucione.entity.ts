import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('devoluciones')
export class Devolucion {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'asignacion_id', type: 'uuid' })
  asignacionId: string;

  @Column({ name: 'condicion_activo', length: 30 })
  condicionActivo: string;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones?: string;

  @Column({ name: 'recibido_por', type: 'uuid', nullable: true })
  recibidoPor?: string;

  @Column({ name: 'recibido_en', type: 'timestamptz' })
  recibidoEn: Date;

  @Column({ name: 'documento_id', type: 'uuid', nullable: true })
  documentoId?: string;

  @Column({ name: 'estado', length: 30, default: 'pendiente_documento' })
  estado: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
