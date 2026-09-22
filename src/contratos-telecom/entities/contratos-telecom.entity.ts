import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('contratos_telecom')
export class ContratoTelecom {
  @PrimaryGeneratedColumn('uuid', { name: 'id' }) id: string;
  @Column({ name: 'empresa_id', type: 'uuid' }) empresaId: string;
  @Column({ name: 'operadora_id', type: 'uuid' }) operadoraId: string;
  @Column({ name: 'codigo', length: 80 }) codigo: string;
  @Column({ name: 'nombre', length: 160 }) nombre: string;
  @Column({ name: 'numero_contrato', length: 120, nullable: true }) numeroContrato?: string;
  @Column({ name: 'inicia_en', type: 'date' }) iniciaEn: string;
  @Column({ name: 'termina_en', type: 'date', nullable: true }) terminaEn?: string;
  @Column({ name: 'dia_renovacion', type: 'smallint', default: 1 }) diaRenovacion: number;
  @Column({ name: 'estado', length: 20, default: 'borrador' }) estado: string;
  @Column({ name: 'observaciones', type: 'text', nullable: true }) observaciones?: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
