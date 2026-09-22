import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('reglas_negocio')
export class ReglaNegocio {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'dominio', length: 40 }) dominio: string;
  @Column({ name: 'clave', length: 160 }) clave: string;
  @Column({ name: 'nombre', length: 180 }) nombre: string;
  @Column({ name: 'descripcion', type: 'text', nullable: true }) descripcion?: string;
  @Column({ name: 'alcance_tipo', length: 40, default: 'tenant' }) alcanceTipo: string;
  @Column({ name: 'alcance_id', type: 'uuid', nullable: true }) alcanceId?: string;
  @Column({ name: 'configuracion', type: 'jsonb' }) configuracion: Record<string, unknown>;
  @Column({ name: 'prioridad', type: 'int', default: 0 }) prioridad: number;
  @Column({ name: 'version', type: 'int', default: 1 }) version: number;
  @Column({ name: 'estado', length: 20, default: 'borrador' }) estado: string;
  @Column({ name: 'vigente_desde', type: 'timestamptz', nullable: true }) vigenteDesde?: Date;
  @Column({ name: 'vigente_hasta', type: 'timestamptz', nullable: true }) vigenteHasta?: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
