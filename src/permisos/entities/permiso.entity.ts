import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('permisos')
export class Permiso {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'codigo', length: 160, unique: true })
  codigo: string;

  @Column({ name: 'modulo_clave', length: 80 })
  moduloClave: string;

  @Column({ name: 'recurso_clave', length: 80 })
  recursoClave: string;

  @Column({ name: 'accion_clave', length: 80 })
  accionClave: string;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
