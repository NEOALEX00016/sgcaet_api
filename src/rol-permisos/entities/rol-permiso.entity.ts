import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Empresa } from '../../empresas/entities/empresa.entity';
import { Rol } from '../../roles/entities/role.entity';
import { Permiso } from '../../permisos/entities/permiso.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('rol_permisos')
export class RolPermiso {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'rol_id', type: 'uuid' })
  rolId: string;

  @Column({ name: 'permiso_id', type: 'uuid' })
  permisoId: string;

  @Column({ name: 'otorgado_por', type: 'uuid', nullable: true })
  otorgadoPor?: string;

  @Column({ name: 'otorgado_en', type: 'timestamptz' })
  otorgadoEn: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Empresa)
  @JoinColumn({ name: 'empresa_id' })
  empresa: Empresa;

  @ManyToOne(() => Rol)
  @JoinColumn({ name: 'rol_id' })
  rol: Rol;

  @ManyToOne(() => Permiso)
  @JoinColumn({ name: 'permiso_id' })
  permiso: Permiso;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'otorgado_por' })
  usuarioOtorgador?: Usuario;
}
