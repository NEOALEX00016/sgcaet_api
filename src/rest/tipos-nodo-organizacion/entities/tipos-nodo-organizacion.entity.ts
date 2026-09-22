import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('catalogo_tipos_nodo_organizacion')
export class TiposNodoOrganizacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid', nullable: true })
  empresaId?: string;

  @Column({ name: 'codigo', length: 60 })
  codigo: string;

  @Column({ name: 'nombre_visible', length: 120 })
  nombreVisible: string;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion?: string;

  @Column({ name: 'es_sistema', default: false })
  esSistema: boolean;

  @Column({ name: 'esta_activo', default: true })
  estaActivo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
