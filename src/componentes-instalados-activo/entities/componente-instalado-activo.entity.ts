import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('componentes_instalados_activo')
export class ComponenteInstaladoActivo {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'activo_id', type: 'uuid' }) activoId: string;
  @Column({ name: 'especificacion_tipo_activo_id', type: 'uuid' }) especificacionTipoActivoId: string;
  @Column({ name: 'pieza_repuesto_id', type: 'uuid', nullable: true }) piezaRepuestoId?: string;
  @Column({ name: 'unidad_repuesto_id', type: 'uuid', nullable: true }) unidadRepuestoId?: string;
  @Column({ name: 'valor', length: 180, nullable: true }) valor?: string;
  @Column({ name: 'unidad', length: 30, nullable: true }) unidad?: string;
  @Column({ name: 'numero_serie_externo', length: 160, nullable: true }) numeroSerieExterno?: string;
  @Column({ name: 'estado', length: 20, default: 'instalado' }) estado: 'instalado' | 'retirado' | 'defectuoso';
  @Column({ name: 'instalado_en', type: 'timestamptz' }) instaladoEn: Date;
  @Column({ name: 'retirado_en', type: 'timestamptz', nullable: true }) retiradoEn?: Date;
  @Column({ name: 'instalado_por', type: 'uuid' }) instaladoPor: string;
  @Column({ name: 'reparacion_instalacion_id', type: 'uuid', nullable: true }) reparacionInstalacionId?: string;
  @Column({ name: 'reparacion_retiro_id', type: 'uuid', nullable: true }) reparacionRetiroId?: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
