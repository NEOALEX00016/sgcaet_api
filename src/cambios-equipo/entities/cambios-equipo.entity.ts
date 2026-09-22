import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('cambios_equipo')
export class CambioEquipo {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'asignacion_id', type: 'uuid' })
  asignacionId: string;

  @Column({ name: 'activo_anterior_id', type: 'uuid' })
  activoAnteriorId: string;

  @Column({ name: 'activo_nuevo_id', type: 'uuid' })
  activoNuevoId: string;

  @Column({ name: 'motivo', type: 'text' })
  motivo: string;

  @Column({ name: 'autorizado_por', type: 'uuid', nullable: true })
  autorizadoPor?: string;

  @Column({ name: 'ejecutado_en', type: 'timestamptz' })
  ejecutadoEn: Date;

  @Column({ name: 'documento_id', type: 'uuid', nullable: true })
  documentoId?: string;

  @Column({ name: 'estado', length: 30, default: 'pendiente_documento' })
  estado: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
