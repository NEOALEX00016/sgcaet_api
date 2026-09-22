import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('persona_estructura_organizacional')
export class PersonaEstructuraOrganizacional {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'persona_id', type: 'uuid' }) personaId: string;
  @Column({ name: 'estructura_nodo_id', type: 'uuid' })
  estructuraNodoId: string;
  @Column({ name: 'rol_en_nodo', length: 120, nullable: true })
  rolEnNodo?: string;
  @Column({ name: 'es_principal', default: false }) esPrincipal: boolean;
  @Column({ name: 'inicia_en', type: 'date', nullable: true })
  iniciaEn?: string;
  @Column({ name: 'finaliza_en', type: 'date', nullable: true })
  finalizaEn?: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
