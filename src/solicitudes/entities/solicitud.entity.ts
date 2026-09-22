import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('solicitudes_portal')
export class Solicitud {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'usuario_id', type: 'uuid' }) usuarioId: string;
  @Column({ name: 'persona_id', type: 'uuid', nullable: true })
  personaId?: string;
  @Column({ name: 'tipo_solicitud', length: 20 }) tipoSolicitud: string;
  @Column({ name: 'dominio', length: 30, default: 'equipos' }) dominio: string;
  @Column({ name: 'grupo_id', type: 'uuid', nullable: true }) grupoId?: string;
  @Column({ name: 'solicitud_padre_id', type: 'uuid', nullable: true }) solicitudPadreId?: string;
  @Column({ name: 'recurso_tipo', length: 80 }) recursoTipo: string;
  @Column({ name: 'recurso_id', type: 'uuid', nullable: true })
  recursoId?: string;
  @Column({
    name: 'cantidad',
    type: 'numeric',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  cantidad?: string;
  @Column({ name: 'unidad', length: 20, nullable: true }) unidad?: string;
  @Column({ name: 'desde_en', type: 'timestamptz', nullable: true })
  desdeEn?: Date;
  @Column({ name: 'hasta_en', type: 'timestamptz', nullable: true })
  hastaEn?: Date;
  @Column({ name: 'motivo', type: 'text', nullable: true }) motivo?: string;
  @Column({ name: 'estado', length: 20, default: 'pendiente' }) estado: string;
  @Column({ name: 'origen', length: 20, default: 'portal' }) origen: string;
  @Column({ name: 'canal_entrada', length: 30, nullable: true })
  canalEntrada?: string;
  @Column({ name: 'referencia_externa', length: 160, nullable: true })
  referenciaExterna?: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
