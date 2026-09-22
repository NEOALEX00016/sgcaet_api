import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('eventos_persona_laboral')
export class EventosPersonaLaboral {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'persona_id', type: 'uuid' }) personaId: string;
  @Column({ name: 'fuente_empleados_id', type: 'uuid', nullable: true })
  fuenteEmpleadosId?: string;
  @Column({ name: 'tipo_evento', length: 30 }) tipoEvento: string;
  @Column({ name: 'estado_anterior', length: 20, nullable: true })
  estadoAnterior?: string;
  @Column({ name: 'estado_nuevo', length: 20 }) estadoNuevo: string;
  @Column({ name: 'payload', type: 'jsonb', nullable: true }) payload?: Record<
    string,
    unknown
  >;
  @Column({ name: 'detectado_en', type: 'timestamptz', default: () => 'now()' })
  detectadoEn: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
