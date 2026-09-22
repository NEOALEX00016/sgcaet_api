import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Empresa } from '../../empresas/entities/empresa.entity';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'persona_id', type: 'uuid', nullable: true })
  personaId?: string;

  @ManyToOne(() => Empresa)
  @JoinColumn({ name: 'empresa_id' })
  empresa: Empresa;

  @Column({ name: 'correo', length: 180 })
  correo: string;

  @Column({ name: 'nombre_usuario', length: 80, nullable: true })
  nombreUsuario?: string;

  @Column({ name: 'nombres', length: 120 })
  nombres: string;

  @Column({ name: 'apellidos', length: 120 })
  apellidos: string;

  @Column({ name: 'hash_contrasena', type: 'text', select: false })
  hashContrasena: string;

  @Column({ name: 'es_propietario_plataforma', default: false })
  esPropietarioPlataforma: boolean;

  @Column({ name: 'estado', length: 20, default: 'activo' })
  estado: string;

  @Column({ name: 'debe_cambiar_contrasena', default: true })
  debeCambiarContrasena: boolean;

  @Column({ name: 'ultimo_acceso_en', type: 'timestamptz', nullable: true })
  ultimoAccesoEn?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
