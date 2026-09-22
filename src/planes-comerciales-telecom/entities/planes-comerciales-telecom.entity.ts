import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
@Entity('planes_comerciales_telecom')
export class PlanComercialTelecom {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'pool_telecom_id', type: 'uuid' }) poolTelecomId: string;
  @Column({ name: 'operadora_id', type: 'uuid' }) operadoraId: string;
  @Column({ name: 'codigo', length: 80 }) codigo: string;
  @Column({ name: 'nombre', length: 160 }) nombre: string;
  @Column({ name: 'descripcion', type: 'text', nullable: true }) descripcion?: string;
  @Column({ name: 'minutos_incluidos', type: 'numeric', precision: 18, scale: 4, default: 0 }) minutosIncluidos: string;
  @Column({ name: 'datos_incluidos', type: 'numeric', precision: 18, scale: 4, default: 0 }) datosIncluidos: string;
  @Column({ name: 'datos_unidad', length: 10, default: 'mb' }) datosUnidad: string;
  @Column({ name: 'sms_incluidos', type: 'numeric', precision: 18, scale: 4, default: 0 }) smsIncluidos: string;
  @Column({ name: 'costo_mensual', type: 'numeric', precision: 14, scale: 2, nullable: true }) costoMensual?: string;
  @Column({ name: 'moneda', length: 3, default: 'DOP' }) moneda: string;
  @Column({ name: 'esta_activo', default: true }) estaActivo: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
