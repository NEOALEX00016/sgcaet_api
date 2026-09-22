import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('empresas')
export class Empresa {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'codigo', length: 50, unique: true })
  codigo: string;

  @Column({ name: 'nombre_legal', length: 180 })
  nombreLegal: string;

  @Column({ name: 'nombre_comercial', length: 180, nullable: true })
  nombreComercial?: string;

  @Column({ name: 'codigo_pais', length: 2, default: 'DO' })
  codigoPais: string;

  @Column({ name: 'tipo_identificacion_fiscal', length: 20 })
  tipoIdentificacionFiscal: string;

  @Column({ name: 'numero_identificacion_fiscal', length: 30 })
  numeroIdentificacionFiscal: string;

  @Column({ name: 'correo', length: 180, nullable: true })
  correo?: string;

  @Column({ name: 'telefono', length: 40, nullable: true })
  telefono?: string;

  @Column({ name: 'sitio_web', length: 255, nullable: true })
  sitioWeb?: string;

  @Column({
    name: 'zona_horaria',
    length: 60,
    default: 'America/Santo_Domingo',
  })
  zonaHoraria: string;

  @Column({ name: 'moneda', length: 3, default: 'DOP' })
  moneda: string;

  @Column({ name: 'estado', length: 20, default: 'activa' })
  estado: string;

  @Column({ name: 'esta_activa', default: true })
  estaActiva: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
