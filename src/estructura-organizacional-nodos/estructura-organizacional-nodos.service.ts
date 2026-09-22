import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreateEstructuraOrganizacionalNodoDto } from './dto/create-estructura-organizacional-nodo.dto';
import { UpdateEstructuraOrganizacionalNodoDto } from './dto/update-estructura-organizacional-nodo.dto';
import { EstructuraOrganizacionalNodo } from './entities/estructura-organizacional-nodo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
@Injectable()
export class EstructuraOrganizacionalNodosService {
  constructor(
    @InjectRepository(EstructuraOrganizacionalNodo)
    private readonly repo: Repository<EstructuraOrganizacionalNodo>,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacora: Repository<BitacoraAuditoriaSistema>,
  ) {}
  async create(
    dto: CreateEstructuraOrganizacionalNodoDto,
    user: AuthenticatedUser,
  ) {
    await this.actor(user);
    await this.parent(dto.nodoPadreId, user.empresaId);
    const item = await this.repo.save(
      this.repo.create({
        ...dto,
        empresaId: user.empresaId,
        estaActivo: dto.estaActivo ?? true,
      }),
    );
    await this.log(user, 'ESTRUCTURA_NODOS_CREAR', item.id);
    return item;
  }
  findAll(empresaId: string) {
    return this.repo.find({ where: { empresaId }, order: { nombre: 'ASC' } });
  }
  async findOne(id: string, empresaId: string) {
    const item = await this.repo.findOne({ where: { id, empresaId } });
    if (!item) throw new NotFoundException('Nodo organizacional no encontrado');
    return item;
  }
  async update(
    id: string,
    dto: UpdateEstructuraOrganizacionalNodoDto,
    user: AuthenticatedUser,
  ) {
    const item = await this.findOne(id, user.empresaId);
    await this.actor(user);
    await this.parent(dto.nodoPadreId, user.empresaId, id);
    const saved = await this.repo.save(this.repo.merge(item, dto));
    await this.log(user, 'ESTRUCTURA_NODOS_ACTUALIZAR', id);
    return saved;
  }
  async remove(id: string, user: AuthenticatedUser) {
    const item = await this.findOne(id, user.empresaId);
    await this.actor(user);
    item.estaActivo = false;
    const saved = await this.repo.save(item);
    await this.log(user, 'ESTRUCTURA_NODOS_DESACTIVAR', id);
    return saved;
  }
  private async parent(
    id: string | undefined,
    empresaId: string,
    self?: string,
  ) {
    if (!id) return;
    if (id === self) throw new BadRequestException('Nodo padre invalido');

    const visited = new Set<string>();
    let cursorId: string | undefined = id;
    let isFirst = true;

    while (cursorId) {
      if (cursorId === self) {
        throw new BadRequestException(
          'Jerarquia invalida: ciclo detectado en nodos organizacionales',
        );
      }

      if (visited.has(cursorId)) {
        throw new BadRequestException(
          'Jerarquia invalida: ciclo detectado en nodos organizacionales',
        );
      }
      visited.add(cursorId);

      const cursor = await this.repo.findOne({
        where: { id: cursorId, empresaId },
      });

      if (!cursor) {
        if (isFirst) {
          throw new NotFoundException('Nodo padre no encontrado');
        }
        return;
      }

      isFirst = false;
      cursorId = cursor.nodoPadreId;
    }
  }
  private async actor(user: AuthenticatedUser) {
    if (
      !(await this.usuarios.findOne({
        where: {
          id: user.userId,
          empresaId: user.empresaId,
          estado: 'activo',
          deletedAt: IsNull(),
        },
      }))
    )
      throw new NotFoundException('Actor no disponible');
  }
  private async log(user: AuthenticatedUser, accion: string, id: string) {
    await this.bitacora.save(
      this.bitacora.create({
        empresaId: user.empresaId,
        usuarioActorId: user.userId,
        accion,
        entidad: 'estructura_organizacional_nodos',
        entidadId: id,
        resultado: 'exito',
      }),
    );
  }
}
