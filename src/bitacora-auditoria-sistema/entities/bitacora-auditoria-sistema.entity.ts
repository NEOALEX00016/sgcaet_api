import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('bitacora_auditoria_sistema')
export class BitacoraAuditoriaSistema {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid', nullable: true })
  empresaId?: string;

  @Column({ name: 'usuario_actor_id', type: 'uuid', nullable: true })
  usuarioActorId?: string;

  @Column({ name: 'accion', length: 80 })
  accion: string;

  @Column({ name: 'entidad', length: 120 })
  entidad: string;

  @Column({ name: 'entidad_id', length: 120 })
  entidadId: string;

  @Column({ name: 'request_id', length: 120, nullable: true })
  requestId?: string;

  @Column({ name: 'direccion_ip', length: 64, nullable: true })
  direccionIp?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @Column({ name: 'valores_anteriores', type: 'jsonb', nullable: true })
  valoresAnteriores?: Record<string, unknown>;

  @Column({ name: 'valores_nuevos', type: 'jsonb', nullable: true })
  valoresNuevos?: Record<string, unknown>;

  @Column({ name: 'resultado', length: 20, default: 'exito' })
  resultado: string;

  @Column({ name: 'motivo', type: 'text', nullable: true })
  motivo?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
