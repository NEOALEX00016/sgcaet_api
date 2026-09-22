import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
@Entity('dominios_catalogo_activos')
export class DominioCatalogoActivo {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'codigo', length: 50 }) codigo: string;
  @Column({ name: 'nombre', length: 120 }) nombre: string;
  @Column({ name: 'icon_name', length: 60, default: 'folder' })
  iconName: string;
  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion?: string;
  @Column({ name: 'es_base', default: false }) esBase: boolean;
  @Column({ name: 'maneja_lineas', default: false }) manejaLineas: boolean;
  @Column({ name: 'maneja_minutos', default: false }) manejaMinutos: boolean;
  @Column({ name: 'maneja_datos', default: false }) manejaDatos: boolean;
  @Column({ name: 'maneja_sms', default: false }) manejaSms: boolean;
  @Column({ name: 'esta_activo', default: true }) estaActivo: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
