import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('prestamos_activo')
export class PrestamoActivo {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'activo_id', type: 'uuid' })
  activoId: string;

  @Column({ name: 'persona_id', type: 'uuid', nullable: true })
  personaId?: string;

  @Column({ name: 'departamento_id', type: 'uuid', nullable: true })
  departamentoId?: string;

  @Column({ name: 'entregado_por', type: 'uuid', nullable: true })
  entregadoPor?: string;

  @Column({ name: 'fecha_salida', type: 'timestamptz' })
  fechaSalida: Date;

  @Column({
    name: 'fecha_prevista_retorno',
    type: 'timestamptz',
    nullable: true,
  })
  fechaPrevistaRetorno?: Date;

  @Column({ name: 'fecha_retorno_real', type: 'timestamptz', nullable: true })
  fechaRetornoReal?: Date;

  @Column({ name: 'estado', length: 20, default: 'prestado' })
  estado: string;

  @Column({ name: 'solicitud_origen_id', type: 'uuid', nullable: true })
  solicitudOrigenId?: string;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
