import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('personas')
export class Persona {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'codigo_interno', length: 50 })
  codigoInterno: string;

  @Column({ name: 'nombres', length: 120 })
  nombres: string;

  @Column({ name: 'apellidos', length: 120 })
  apellidos: string;

  @Column({ name: 'tipo_documento', length: 20, default: 'cedula' })
  tipoDocumento: string;

  @Column({ name: 'numero_documento', length: 30 })
  numeroDocumento: string;

  @Column({ name: 'correo', length: 180, nullable: true })
  correo?: string;

  @Column({ name: 'telefono', length: 40, nullable: true })
  telefono?: string;

  @Column({ name: 'estado', length: 20, default: 'activo' })
  estado: string;

  @Column({ name: 'tipo_persona', length: 20, default: 'empleado' })
  tipoPersona: string;

  @Column({ name: 'origen_registro', length: 20, default: 'manual' })
  origenRegistro: string;

  @Column({ name: 'fuente_empleados_id', type: 'uuid', nullable: true })
  fuenteEmpleadosId?: string;

  @Column({ name: 'identificador_externo', length: 120, nullable: true })
  identificadorExterno?: string;

  @Column({ name: 'estado_laboral', length: 20, default: 'activo' })
  estadoLaboral: string;

  @Column({ name: 'fecha_salida', type: 'date', nullable: true })
  fechaSalida?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
