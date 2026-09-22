import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ActasAsignacionService } from './actas-asignacion.service';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';
import { ActaAsignacion } from './entities/acta-asignacion.entity';
import { ActaAsignacionRecurso } from './entities/acta-asignacion-recurso.entity';
import { PoliticaFormularioAsignacion } from '../politicas-formulario-asignacion/entities/politicas-formulario-asignacion.entity';
import { FormularioVersione } from '../formulario-versiones/entities/formulario-versione.entity';
import { Activo } from '../activos/entities/activo.entity';
import { TiposActivo } from '../tipos-activo/entities/tipos-activo.entity';
import { CategoriaEquipo } from '../categorias-equipo/entities/categoria-equipo.entity';
import { DominioCatalogoActivo } from '../dominios-catalogo-activos/entities/dominio-catalogo-activo.entity';
import { DocumentEntity } from '../documents/entities/document.entity';
import { Formulario } from '../formularios/entities/formulario.entity';
import { Persona } from '../personas/entities/persona.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Departamento } from '../departamentos/entities/departamento.entity';
import { AtributosDinamicosActivo } from '../atributos-dinamicos-activo/entities/atributos-dinamicos-activo.entity';
import { EspecificacionTipoActivo } from '../especificaciones-tipo-activo/entities/especificacion-tipo-activo.entity';

describe('ActasAsignacionService', () => {
  let service: ActasAsignacionService;

  const makeRepo = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((v) => v),
    save: jest.fn(async (v) => ({ ...v, id: v.id ?? 'id-generated' })),
  });

  const asignacionesRepo = makeRepo();
  const recursosRepo = makeRepo();
  const actasRepo = makeRepo();
  const actaRecursosRepo = makeRepo();
  const politicasRepo = makeRepo();
  const versionesRepo = makeRepo();
  const activosRepo = makeRepo();
  const tiposActivosRepo = makeRepo();
  const categoriasRepo = makeRepo();
  const dominiosRepo = makeRepo();
  const documentsRepo = makeRepo();
  const formulariosRepo = makeRepo();
  const personasRepo = makeRepo();
  const usuariosRepo = makeRepo();
  const departamentosRepo = makeRepo();
  const atributosRepo = makeRepo();
  const especificacionesRepo = makeRepo();

  const user = {
    userId: 'u-1',
    empresaId: 'e-1',
    correo: 'admin@tenant.test',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActasAsignacionService,
        { provide: getRepositoryToken(Asignacion), useValue: asignacionesRepo },
        { provide: getRepositoryToken(AsignacionRecurso), useValue: recursosRepo },
        { provide: getRepositoryToken(ActaAsignacion), useValue: actasRepo },
        {
          provide: getRepositoryToken(ActaAsignacionRecurso),
          useValue: actaRecursosRepo,
        },
        {
          provide: getRepositoryToken(PoliticaFormularioAsignacion),
          useValue: politicasRepo,
        },
        { provide: getRepositoryToken(FormularioVersione), useValue: versionesRepo },
        { provide: getRepositoryToken(Activo), useValue: activosRepo },
        { provide: getRepositoryToken(TiposActivo), useValue: tiposActivosRepo },
        { provide: getRepositoryToken(CategoriaEquipo), useValue: categoriasRepo },
        {
          provide: getRepositoryToken(DominioCatalogoActivo),
          useValue: dominiosRepo,
        },
        {
          provide: getRepositoryToken(DocumentEntity),
          useValue: documentsRepo,
        },
        {
          provide: getRepositoryToken(Formulario),
          useValue: formulariosRepo,
        },
        { provide: getRepositoryToken(Persona), useValue: personasRepo },
        { provide: getRepositoryToken(Usuario), useValue: usuariosRepo },
        { provide: getRepositoryToken(Departamento), useValue: departamentosRepo },
        { provide: getRepositoryToken(AtributosDinamicosActivo), useValue: atributosRepo },
        { provide: getRepositoryToken(EspecificacionTipoActivo), useValue: especificacionesRepo },
      ],
    }).compile();

    service = module.get<ActasAsignacionService>(ActasAsignacionService);
    [
      asignacionesRepo,
      recursosRepo,
      actasRepo,
      actaRecursosRepo,
      politicasRepo,
      versionesRepo,
      activosRepo,
      tiposActivosRepo,
      categoriasRepo,
      dominiosRepo,
      documentsRepo,
      formulariosRepo,
      personasRepo,
      usuariosRepo,
      departamentosRepo,
      atributosRepo,
      especificacionesRepo,
    ].forEach((repo) => Object.values(repo).forEach((fn) => fn.mockClear?.()));
  });

  it('prepara actas por version efectiva y vincula recursos', async () => {
    asignacionesRepo.findOne.mockResolvedValue({
      id: 'asg-1',
      empresaId: 'e-1',
      tipoAsignacionId: 'tipo-1',
      estado: 'autorizada',
    });
    recursosRepo.find.mockResolvedValue([
      { id: 'ar-1', empresaId: 'e-1', asignacionId: 'asg-1', activoId: 'a-1' },
    ]);
    activosRepo.findOne.mockResolvedValue({ id: 'a-1', empresaId: 'e-1', tipoActivoId: 'ta-1' });
    tiposActivosRepo.findOne.mockResolvedValue({ id: 'ta-1', empresaId: 'e-1', categoriaEquipoId: 'cat-1', estaActivo: true });
    categoriasRepo.findOne.mockResolvedValue({ id: 'cat-1', empresaId: 'e-1', dominioId: 'dom-1', estaActiva: true });
    politicasRepo.findOne.mockResolvedValue({ id: 'p-cat-1', formularioId: 'f-1', categoriaId: 'cat-1' });
    politicasRepo.find.mockResolvedValue([{ id: 'p-cat-1', formularioId: 'f-1', categoriaId: 'cat-1' }]);
    versionesRepo.find.mockResolvedValue([{ id: 'fv-3', versionNumero: 3, estado: 'publicada' }]);
    actasRepo.findOne.mockResolvedValue(null);
    actaRecursosRepo.findOne.mockResolvedValue(null);

    const result = await service.prepararEntrega('asg-1', user as never);

    expect(result.totalActas).toBe(1);
    expect(actasRepo.save).toHaveBeenCalled();
    expect(actaRecursosRepo.save).toHaveBeenCalled();
  });

  it('resuelve politica por categoria sin exigir dominio', async () => {
    asignacionesRepo.findOne.mockResolvedValue({ id: 'asg-2', empresaId: 'e-1', tipoAsignacionId: 'tipo-1', estado: 'autorizada' });
    recursosRepo.find.mockResolvedValue([{ id: 'ar-2', empresaId: 'e-1', asignacionId: 'asg-2', activoId: 'a-2' }]);
    activosRepo.findOne.mockResolvedValue({ id: 'a-2', empresaId: 'e-1', tipoActivoId: 'ta-2' });
    tiposActivosRepo.findOne.mockResolvedValue({ id: 'ta-2', empresaId: 'e-1', categoriaEquipoId: 'cat-2', estaActivo: true });
    categoriasRepo.findOne.mockResolvedValue({ id: 'cat-2', empresaId: 'e-1', dominioId: undefined, estaActiva: true });
    politicasRepo.find.mockResolvedValue([{ id: 'p-cat-2', formularioId: 'f-2', categoriaId: 'cat-2', dominioId: undefined }]);
    versionesRepo.find.mockResolvedValue([{ id: 'fv-4', versionNumero: 1, estado: 'publicada' }]);
    actasRepo.findOne.mockResolvedValue(null);
    actaRecursosRepo.findOne.mockResolvedValue(null);

    const result = await service.prepararEntrega('asg-2', user as never);

    expect(result.totalActas).toBe(1);
    expect(actasRepo.save).toHaveBeenCalled();
  });

  it('imprime acta usando version congelada', async () => {
    actasRepo.findOne.mockResolvedValue({
      id: 'acta-1',
      empresaId: 'e-1',
      asignacionId: 'asg-1',
      formularioVersionId: 'fv-9',
    });
    versionesRepo.findOne.mockResolvedValue({
      id: 'fv-9',
      empresaId: 'e-1',
      plantillaHtml: '<h1>Acta entrega</h1><p>{{usuario_nombre}} - {{numero_inventario}} - {{capacidades_equipo}}</p>',
    });
    asignacionesRepo.findOne.mockResolvedValue({
      id: 'asg-1', empresaId: 'e-1', personaId: 'persona-1', fechaAsignacion: new Date('2026-09-21T00:00:00Z'),
    });
    personasRepo.findOne.mockResolvedValue({ nombres: 'Neftali', apellidos: 'Rosario' });
    usuariosRepo.findOne.mockResolvedValue({ nombres: 'Administrador', apellidos: 'SGCAET' });
    actaRecursosRepo.find.mockResolvedValue([{ asignacionRecursoId: 'ar-1' }]);
    recursosRepo.find.mockResolvedValue([{ id: 'ar-1', activoId: 'asset-1' }]);
    activosRepo.findOne.mockResolvedValue({ id: 'asset-1', tipoActivoId: 'type-1', codigoActivo: 'EQ-001', nombre: 'Laptop' });
    tiposActivosRepo.findOne.mockResolvedValue({ id: 'type-1', nombre: 'Laptop' });
    atributosRepo.find.mockResolvedValue([{ clave: 'ram16', valorNumero: '16.0000' }]);
    especificacionesRepo.find.mockResolvedValue([{ clave: 'ram16', nombre: 'ram16' }]);

    const result = await service.imprimirActa('acta-1', user as never);

    expect(result.formularioVersionId).toBe('fv-9');
    expect(result.html).toContain('<!doctype html>');
    expect(result.html).toContain('<h1>Acta entrega</h1>');
    expect(result.html).toContain('Neftali Rosario - EQ-001 - ram16: 16');
    expect(result.html).not.toContain('{{');
  });

  it('rechaza preparar entrega antes de autorizar', async () => {
    asignacionesRepo.findOne.mockResolvedValue({
      id: 'asg-draft',
      empresaId: 'e-1',
      tipoAsignacionId: 'tipo-1',
      estado: 'borrador',
    });

    await expect(
      service.prepararEntrega('asg-draft', user as never),
    ).rejects.toThrow('La asignacion debe estar autorizada');
    expect(recursosRepo.find).not.toHaveBeenCalled();
  });

  it('devuelve detalle visible de formulario, version y recursos', async () => {
    actasRepo.find.mockResolvedValue([
      {
        id: 'acta-detail',
        empresaId: 'e-1',
        asignacionId: 'asg-1',
        formularioVersionId: 'fv-3',
        estado: 'pendiente_firma',
      },
    ]);
    versionesRepo.findOne.mockResolvedValue({
      id: 'fv-3',
      formularioId: 'form-1',
      versionNumero: 3,
    });
    formulariosRepo.findOne.mockResolvedValue({
      id: 'form-1',
      codigo: 'ACTA-EQUIPO',
      nombre: 'Acta de entrega de equipo',
    });
    actaRecursosRepo.find.mockResolvedValue([
      { actaAsignacionId: 'acta-detail', asignacionRecursoId: 'ar-1' },
    ]);
    recursosRepo.find.mockResolvedValue([
      { id: 'ar-1', tipoRecurso: 'activo', activoId: 'asset-1' },
      { id: 'ar-2', tipoRecurso: 'activo', activoId: 'asset-2' },
    ]);

    const result = await service.findByAsignacion('asg-1', user as never);

    expect(result[0]).toMatchObject({
      formulario: { nombre: 'Acta de entrega de equipo' },
      versionNumero: 3,
      recursos: [{ id: 'ar-1', activoId: 'asset-1' }],
    });
  });

  it('firma acta vinculando documento y sellando estado', async () => {
    actasRepo.findOne.mockResolvedValue({
      id: 'acta-2',
      empresaId: 'e-1',
      asignacionId: 'asg-2',
      formularioVersionId: 'fv-2',
      estado: 'pendiente_firma',
      documentoId: undefined,
      firmadaEn: undefined,
    });
    documentsRepo.findOne.mockResolvedValue({
      id: 'doc-1',
      empresaId: 'e-1',
      entidadRelacionada: 'actas_asignacion',
      entidadRelacionadaId: 'acta-2',
    });
    actasRepo.save.mockResolvedValue({
      id: 'acta-2',
      empresaId: 'e-1',
      asignacionId: 'asg-2',
      formularioVersionId: 'fv-2',
      estado: 'firmada',
      documentoId: 'doc-1',
      firmadaEn: new Date('2026-09-18T10:00:00.000Z'),
    });

    const result = await service.firmarActa('acta-2', 'doc-1', user as never);

    expect(result.estado).toBe('firmada');
    expect(result.documentoId).toBe('doc-1');
    expect(actasRepo.save).toHaveBeenCalled();
  });

  it('rechaza firma cuando documento no pertenece al acta', async () => {
    actasRepo.findOne.mockResolvedValue({
      id: 'acta-3',
      empresaId: 'e-1',
      formularioVersionId: 'fv-2',
    });
    documentsRepo.findOne.mockResolvedValue({
      id: 'doc-9',
      empresaId: 'e-1',
      entidadRelacionada: 'asignaciones',
      entidadRelacionadaId: 'asg-1',
    });

    await expect(
      service.firmarActa('acta-3', 'doc-9', user as never),
    ).rejects.toThrow('El documento firmado debe estar vinculado a entidad actas_asignacion');
  });
});
