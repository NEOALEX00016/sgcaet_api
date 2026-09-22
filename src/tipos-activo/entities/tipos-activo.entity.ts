import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tipos_activo')
export class TiposActivo {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;
  @Column({ name: 'categoria_equipo_id', type: 'uuid', nullable: true })
  categoriaEquipoId?: string;

  @Column({ name: 'codigo', length: 50 })
  codigo: string;

  @Column({ name: 'nombre', length: 120 })
  nombre: string;
  @Column({ name: 'icon_name', length: 60, default: 'description' })
  iconName: string;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion?: string;

  @Column({ name: 'esta_activo', default: true })
  estaActivo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
