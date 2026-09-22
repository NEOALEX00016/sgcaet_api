import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('lineas_telefonicas')
export class LineaTelefonica {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'operadora_id', type: 'uuid', nullable: true })
  operadoraId?: string;

  @Column({ name: 'numero', length: 30 })
  numero: string;

  @Column({ name: 'iccid', length: 50, nullable: true })
  iccid?: string;

  @Column({ name: 'tipo_linea', length: 20, default: 'voz_datos' })
  tipoLinea: string;

  @Column({ name: 'estado', length: 20, default: 'registrada' })
  estado: string;

  @Column({ name: 'esta_activa', default: true })
  estaActiva: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
