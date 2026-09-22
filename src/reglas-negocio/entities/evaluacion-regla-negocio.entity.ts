import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('evaluaciones_reglas_negocio')
export class EvaluacionReglaNegocio {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'regla_id', type: 'uuid' }) reglaId: string;
  @Column({ name: 'regla_version', type: 'int' }) reglaVersion: number;
  @Column({ name: 'dominio', length: 40 }) dominio: string;
  @Column({ name: 'clave', length: 160 }) clave: string;
  @Column({ name: 'alcance_tipo', length: 40 }) alcanceTipo: string;
  @Column({ name: 'alcance_id', type: 'uuid', nullable: true }) alcanceId?: string;
  @Column({ name: 'contexto', type: 'jsonb' }) contexto: Record<string, unknown>;
  @Column({ name: 'configuracion_resultante', type: 'jsonb' }) configuracionResultante: Record<string, unknown>;
  @Column({ name: 'resultado', type: 'jsonb', nullable: true }) resultado?: Record<string, unknown>;
  @Column({ name: 'entidad_tipo', length: 80, nullable: true }) entidadTipo?: string;
  @Column({ name: 'entidad_id', type: 'uuid', nullable: true }) entidadId?: string;
  @Column({ name: 'usuario_actor_id', type: 'uuid', nullable: true }) usuarioActorId?: string;
  @CreateDateColumn({ name: 'evaluada_en' }) evaluadaEn: Date;
}
