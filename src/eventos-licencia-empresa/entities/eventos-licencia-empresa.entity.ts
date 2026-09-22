import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
@Entity('eventos_licencia_empresa')
export class EventosLicenciaEmpresa {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'licencia_empresa_id', type: 'uuid' })
  licenciaEmpresaId: string;
  @Column({ name: 'tipo_evento', length: 30 }) tipoEvento: string;
  @Column({ name: 'motivo_evento', type: 'text', nullable: true })
  motivoEvento?: string;
  @Column({ name: 'payload_evento', type: 'jsonb', nullable: true })
  payloadEvento?: Record<string, unknown>;
  @Column({ name: 'realizado_por', type: 'uuid', nullable: true })
  realizadoPor?: string;
  @Column({ name: 'realizado_en', type: 'timestamptz', default: () => 'now()' })
  realizadoEn: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
