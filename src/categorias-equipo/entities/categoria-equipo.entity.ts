import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
@Entity('categorias_equipo')
export class CategoriaEquipo {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'dominio_id', type: 'uuid', nullable: true })
  dominioId?: string;
  @Column({ name: 'codigo', length: 50 }) codigo: string;
  @Column({ name: 'nombre', length: 120 }) nombre: string;
  @Column({ name: 'dominio', length: 60, default: 'equipos' }) dominio: string;
  @Column({ name: 'icon_name', length: 60, default: 'folder' })
  iconName: string;
  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion?: string;
  @Column({ name: 'esta_activa', default: true }) estaActiva: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
