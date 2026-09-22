import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('historial_componentes_activo')
export class HistorialComponentesActivo {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'activo_id', type: 'uuid' })
  activoId: string;

  @Column({ name: 'reparacion_activo_id', type: 'uuid', nullable: true })
  reparacionActivoId?: string;

  @Column({ name: 'componente_clave', length: 100 })
  componenteClave: string;

  @Column({ name: 'componente_nombre', length: 180, nullable: true })
  componenteNombre?: string;

  @Column({ name: 'valor_anterior', type: 'text', nullable: true })
  valorAnterior?: string;

  @Column({ name: 'valor_nuevo', type: 'text', nullable: true })
  valorNuevo?: string;

  @Column({ name: 'unidad_anterior', length: 30, nullable: true })
  unidadAnterior?: string;

  @Column({ name: 'unidad_nueva', length: 30, nullable: true })
  unidadNueva?: string;

  @Column({ name: 'motivo', type: 'text', nullable: true })
  motivo?: string;

  @Column({ name: 'cambiado_en', type: 'timestamptz' })
  cambiadoEn: Date;

  @Column({ name: 'cambiado_por', type: 'uuid' })
  cambiadoPor: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
