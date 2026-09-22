import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('formulario_respuesta_detalles')
export class FormularioRespuestaDetalle {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId: string;

  @Column({ name: 'formulario_respuesta_id', type: 'uuid' })
  formularioRespuestaId: string;

  @Column({ name: 'campo_clave', length: 80 })
  campoClave: string;

  @Column({ name: 'valor_texto', type: 'text', nullable: true })
  valorTexto?: string;

  @Column({
    name: 'valor_numero',
    type: 'numeric',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  valorNumero?: string;

  @Column({ name: 'valor_booleano', nullable: true })
  valorBooleano?: boolean;

  @Column({ name: 'valor_fecha', type: 'timestamptz', nullable: true })
  valorFecha?: Date;

  @Column({ name: 'valor_json', type: 'jsonb', nullable: true })
  valorJson?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
