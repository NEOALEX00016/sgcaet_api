import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
@Entity('asignaciones_linea_persona')
export class AsignacionLineaPersona {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'linea_telefonica_id', type: 'uuid' }) lineaTelefonicaId: string;
  @Column({ name: 'persona_id', type: 'uuid', nullable: true }) personaId?: string;
  @Column({ name: 'departamento_id', type: 'uuid', nullable: true }) departamentoId?: string;
  @Column({ name: 'inicia_en', type: 'timestamptz' }) iniciaEn: Date;
  @Column({ name: 'termina_en', type: 'timestamptz', nullable: true }) terminaEn?: Date;
  @Column({ name: 'estado', length: 20, default: 'activa' }) estado: string;
  @Column({ name: 'motivo', type: 'text', nullable: true }) motivo?: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
