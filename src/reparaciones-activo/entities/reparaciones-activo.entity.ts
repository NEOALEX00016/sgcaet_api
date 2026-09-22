import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('reparaciones_activo')
export class ReparacionActivo {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'activo_id', type: 'uuid' })
  activoId: string;

  @Column({ name: 'asignacion_id', type: 'uuid', nullable: true })
  asignacionId?: string;

  @Column({ name: 'tipo_servicio', length: 20 })
  tipoServicio: string;

  @Column({ name: 'diagnostico', type: 'text' })
  diagnostico: string;

  @Column({ name: 'proveedor_tecnico', length: 180, nullable: true })
  proveedorTecnico?: string;

  @Column({
    name: 'costo',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  costo?: string;

  @Column({ name: 'moneda', type: 'char', length: 3, nullable: true })
  moneda?: string;

  @Column({ name: 'fecha_ingreso', type: 'timestamptz' })
  fechaIngreso: Date;

  @Column({ name: 'fecha_salida', type: 'timestamptz', nullable: true })
  fechaSalida?: Date;

  @Column({ name: 'estado', length: 20, default: 'abierta' })
  estado: string;

  @Column({ name: 'estado_comunicacion_diagnostico', length: 20, default: 'pendiente' })
  estadoComunicacionDiagnostico: string;

  @Column({ name: 'diagnostico_comunicado_en', type: 'timestamptz', nullable: true })
  diagnosticoComunicadoEn?: Date;

  @Column({ name: 'diagnostico_comunicado_por', type: 'uuid', nullable: true })
  diagnosticoComunicadoPor?: string;

  @Column({ name: 'solicitud_origen_id', type: 'uuid', nullable: true })
  solicitudOrigenId?: string;

  @Column({ name: 'resultado', length: 20, nullable: true })
  resultado?: string;

  @Column({ name: 'resolucion', type: 'text', nullable: true })
  resolucion?: string;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones?: string;

  @Column({ name: 'creado_por', type: 'uuid', nullable: true })
  creadoPor?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
