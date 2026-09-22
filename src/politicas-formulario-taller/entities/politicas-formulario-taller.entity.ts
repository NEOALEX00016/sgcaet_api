import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('politicas_formulario_taller')
export class PoliticaFormularioTaller {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'tipo_servicio', length: 20 }) tipoServicio: string;
  @Column({ name: 'etapa', length: 10 }) etapa: string;
  @Column({ name: 'categoria_equipo_id', type: 'uuid', nullable: true })
  categoriaEquipoId?: string;
  @Column({ name: 'tipo_activo_id', type: 'uuid', nullable: true })
  tipoActivoId?: string;
  @Column({ name: 'formulario_id', type: 'uuid' }) formularioId: string;
  @Column({ name: 'es_obligatoria', default: false }) esObligatoria: boolean;
  @Column({ name: 'esta_activa', default: true }) estaActiva: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
