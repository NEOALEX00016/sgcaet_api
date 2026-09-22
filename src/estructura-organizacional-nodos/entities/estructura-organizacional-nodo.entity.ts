import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('estructura_organizacional_nodos')
export class EstructuraOrganizacionalNodo {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'nodo_padre_id', type: 'uuid', nullable: true })
  nodoPadreId?: string;
  @Column({ name: 'tipo_nodo', length: 30 }) tipoNodo: string;
  @Column({ name: 'tipo_nodo_id', type: 'uuid', nullable: true })
  tipoNodoId?: string;
  @Column({ name: 'codigo', length: 60 }) codigo: string;
  @Column({ name: 'nombre', length: 160 }) nombre: string;
  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion?: string;
  @Column({ name: 'esta_activo', default: true }) estaActivo: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
