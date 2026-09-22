import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('atributos_dinamicos_activo')
export class AtributosDinamicosActivo {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'activo_id', type: 'uuid' })
  activoId: string;

  @Column({ name: 'clave', length: 100 })
  clave: string;

  @Column({ name: 'valor_texto', type: 'text', nullable: true })
  valorTexto?: string;

  @Column({
    name: 'valor_numero',
    type: 'numeric',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  valorNumero?: string;

  @Column({ name: 'valor_fecha', type: 'date', nullable: true })
  valorFecha?: string;

  @Column({ name: 'valor_booleano', nullable: true })
  valorBooleano?: boolean;

  @Column({ name: 'unidad', length: 30, nullable: true })
  unidad?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
