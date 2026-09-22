import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('ubicaciones')
export class Ubicacione {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'codigo', length: 40 })
  codigo: string;

  @Column({ name: 'nombre', length: 120 })
  nombre: string;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion?: string;

  @Column({ name: 'direccion', type: 'text', nullable: true })
  direccion?: string;

  @Column({
    name: 'latitud',
    type: 'numeric',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  latitud?: string;

  @Column({
    name: 'longitud',
    type: 'numeric',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  longitud?: string;

  @Column({ name: 'esta_activa', default: true })
  estaActiva: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
