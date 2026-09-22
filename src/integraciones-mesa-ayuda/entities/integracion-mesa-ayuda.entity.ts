import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('integraciones_mesa_ayuda')
export class IntegracionMesaAyuda {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'nombre', length: 140 }) nombre: string;
  @Column({ name: 'tipo', length: 20 }) tipo: 'api' | 'email';
  @Column({ name: 'activo', default: true }) activo: boolean;
  @Column({ name: 'base_url', type: 'text', nullable: true }) baseUrl?: string;
  @Column({ name: 'endpoint_solicitud', type: 'text', nullable: true })
  endpointSolicitud?: string;
  @Column({ name: 'email_destino', length: 180, nullable: true })
  emailDestino?: string;
  @Column({ name: 'auth_tipo', length: 30, nullable: true }) authTipo?: string;
  @Column({
    name: 'auth_config_cifrada',
    type: 'text',
    nullable: true,
    select: false,
  })
  authConfigCifrada?: string;
  @Column({ name: 'headers_json', type: 'jsonb', nullable: true })
  headersJson?: Record<string, string>;

  @Column({ name: 'ultima_prueba_at', type: 'timestamptz', nullable: true })
  ultimaPruebaAt?: Date;

  @Column({ name: 'ultima_prueba_estado', length: 20, nullable: true })
  ultimaPruebaEstado?: 'ok' | 'error';

  @Column({ name: 'ultima_prueba_detalle', type: 'text', nullable: true })
  ultimaPruebaDetalle?: string;

  @Column({ name: 'ultima_prueba_actor_id', type: 'uuid', nullable: true })
  ultimaPruebaActorId?: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
