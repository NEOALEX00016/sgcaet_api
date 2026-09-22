import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('fuentes_empleados')
export class FuentesEmpleado {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'nombre', length: 140 }) nombre: string;
  @Column({ name: 'tipo_fuente', length: 20 }) tipoFuente: string;
  @Column({ name: 'estado', length: 20, default: 'activa' }) estado: string;
  @Column({ name: 'url_base', type: 'text', nullable: true }) urlBase?: string;
  @Column({ name: 'metodo_autenticacion', length: 30, nullable: true })
  metodoAutenticacion?: string;
  @Column({ name: 'usuario_tecnico', length: 120, nullable: true })
  usuarioTecnico?: string;
  @Column({
    name: 'secreto_cifrado',
    type: 'text',
    nullable: true,
    select: false,
  })
  secretoCifrado?: string;
  @Column({ name: 'esquema_bd', length: 120, nullable: true })
  esquemaBd?: string;
  @Column({ name: 'tabla_o_vista', length: 160, nullable: true })
  tablaOVista?: string;
  @Column({ name: 'consulta_sql', type: 'text', nullable: true })
  consultaSql?: string;
  @Column({ name: 'mapeo_campos', type: 'jsonb' }) mapeoCampos: Record<
    string,
    unknown
  >;
  @Column({ name: 'usa_verificacion_baja', default: false })
  usaVerificacionBaja: boolean;

  @Column({ name: 'ultima_sincronizacion_en', type: 'timestamptz', nullable: true })
  ultimaSincronizacionEn?: Date;

  @Column({ name: 'proxima_sincronizacion_en', type: 'timestamptz', nullable: true })
  proximaSincronizacionEn?: Date;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
