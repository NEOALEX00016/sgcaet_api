import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('ejecuciones_carga_empleados')
export class EjecucionesCargaEmpleado {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'fuente_empleados_id', type: 'uuid', nullable: true })
  fuenteEmpleadosId?: string;
  @Column({ name: 'tipo_carga', length: 20 }) tipoCarga: string;
  @Column({ name: 'estado', length: 20, default: 'en_proceso' }) estado: string;
  @Column({ name: 'total_registros', default: 0 }) totalRegistros: number;
  @Column({ name: 'creados', default: 0 }) creados: number;
  @Column({ name: 'actualizados', default: 0 }) actualizados: number;
  @Column({ name: 'sin_cambios', default: 0 }) sinCambios: number;
  @Column({ name: 'errores', default: 0 }) errores: number;
  @Column({ name: 'detalle_error', type: 'text', nullable: true })
  detalleError?: string;
  @Column({ name: 'iniciada_en', type: 'timestamptz', default: () => 'now()' })
  iniciadaEn: Date;
  @Column({ name: 'finalizada_en', type: 'timestamptz', nullable: true })
  finalizadaEn?: Date;
  @Column({ name: 'creada_por', type: 'uuid', nullable: true })
  creadaPor?: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
