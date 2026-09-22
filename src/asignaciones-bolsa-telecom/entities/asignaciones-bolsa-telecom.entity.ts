import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('asignaciones_bolsa_telecom')
export class AsignacionBolsaTelecom {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'bolsa_telecom_id', type: 'uuid' })
  bolsaTelecomId: string;

  @Column({ name: 'persona_id', type: 'uuid', nullable: true })
  personaId?: string;

  @Column({ name: 'departamento_id', type: 'uuid', nullable: true })
  departamentoId?: string;

  @Column({ name: 'linea_telefonica_id', type: 'uuid', nullable: true })
  lineaTelefonicaId?: string;

  @Column({ name: 'cantidad', type: 'numeric', precision: 18, scale: 4 })
  cantidad: string;

  @Column({ name: 'unidad', length: 20 })
  unidad: string;

  @Column({ name: 'estado', length: 20, default: 'activa' })
  estado: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
