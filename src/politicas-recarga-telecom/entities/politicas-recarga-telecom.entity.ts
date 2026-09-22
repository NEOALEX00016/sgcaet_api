import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
@Entity('politicas_recarga_telecom')
export class PoliticaRecargaTelecom {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'dominio', length: 30, default: 'telecom' }) dominio: string;
  @Column({ name: 'clave', length: 100 }) clave: string;
  @Column({ name: 'nombre', length: 160 }) nombre: string;
  @Column({ name: 'tipos_capacidad', type: 'jsonb' }) tiposCapacidad: string[];
  @Column({ name: 'alcance_tipo', length: 30, default: 'tenant' }) alcanceTipo: string;
  @Column({ name: 'alcance_id', type: 'uuid', nullable: true }) alcanceId?: string;
  @Column({ name: 'requiere_aprobacion', default: true }) requiereAprobacion: boolean;
  @Column({ name: 'limite_cantidad', type: 'numeric', precision: 18, scale: 4, nullable: true }) limiteCantidad?: string;
  @Column({ name: 'limite_solicitudes_ciclo', type: 'int', nullable: true }) limiteSolicitudesCiclo?: number;
  @Column({ name: 'configuracion_regla', type: 'jsonb', nullable: true }) configuracionRegla?: Record<string, unknown>;
  @Column({ name: 'vigente_desde', type: 'timestamptz', nullable: true }) vigenteDesde?: Date;
  @Column({ name: 'vigente_hasta', type: 'timestamptz', nullable: true }) vigenteHasta?: Date;
  @Column({ name: 'estado', length: 20, default: 'borrador' }) estado: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
