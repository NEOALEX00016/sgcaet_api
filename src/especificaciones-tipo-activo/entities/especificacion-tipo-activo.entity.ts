import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('especificaciones_tipo_activo')
export class EspecificacionTipoActivo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'tipo_activo_id', type: 'uuid', nullable: true })
  tipoActivoId?: string;

  @Column({ name: 'categoria_equipo_id', type: 'uuid', nullable: true })
  categoriaEquipoId?: string;

  @Column({ name: 'clave', length: 100 })
  clave: string;

  @Column({ name: 'nombre', length: 120 })
  nombre: string;

  @Column({ name: 'tipo_dato', length: 20, default: 'texto' })
  tipoDato: 'texto' | 'numero' | 'fecha' | 'booleano';

  @Column({ name: 'unidad', length: 30, nullable: true })
  unidad?: string;

  @Column({ name: 'depende_de_clave', length: 100, nullable: true })
  dependeDeClave?: string;

  @Column({ name: 'valor_predefinido', length: 120, nullable: true })
  valorPredefinido?: string;

  @Column({ name: 'es_obligatoria', default: false })
  esObligatoria: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
