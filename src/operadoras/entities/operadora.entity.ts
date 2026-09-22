import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('operadoras')
export class Operadora {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'codigo', length: 40 })
  codigo: string;

  @Column({ name: 'nombre', length: 120 })
  nombre: string;

  @Column({ name: 'pais', length: 2, default: 'DO' })
  pais: string;

  @Column({ name: 'esta_activa', default: true })
  estaActiva: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
