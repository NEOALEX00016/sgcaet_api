import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('incidencias')
export class Incidencia {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'auditoria_detalle_id', type: 'uuid', nullable: true })
  auditoriaDetalleId?: string;

  @Column({ name: 'activo_id', type: 'uuid', nullable: true })
  activoId?: string;

  @Column({ name: 'linea_telefonica_id', type: 'uuid', nullable: true })
  lineaTelefonicaId?: string;

  @Column({ name: 'codigo', length: 50 })
  codigo: string;

  @Column({ name: 'titulo', length: 180 })
  titulo: string;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion?: string;

  @Column({ name: 'estado', length: 30, default: 'abierta' })
  estado: string;

  @Column({ name: 'prioridad', length: 20, default: 'media' })
  prioridad: string;

  @Column({ name: 'reportada_por', type: 'uuid', nullable: true })
  reportadaPor?: string;

  @Column({ name: 'asignada_a', type: 'uuid', nullable: true })
  asignadaA?: string;

  @Column({ name: 'abierta_en', type: 'timestamptz' })
  abiertaEn: Date;

  @Column({ name: 'cerrada_en', type: 'timestamptz', nullable: true })
  cerradaEn?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
