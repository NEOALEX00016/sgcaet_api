import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
@Entity('direcciones_empresa')
export class DireccionesEmpresa {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'tipo_direccion', length: 20 }) tipoDireccion: string;
  @Column({ name: 'linea_1', length: 255 }) linea1: string;
  @Column({ name: 'linea_2', length: 255, nullable: true }) linea2?: string;
  @Column({ length: 120 }) ciudad: string;
  @Column({ name: 'provincia_estado', length: 120 }) provinciaEstado: string;
  @Column({ name: 'codigo_postal', length: 20, nullable: true })
  codigoPostal?: string;
  @Column({ name: 'codigo_pais', length: 2, default: 'DO' }) codigoPais: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
