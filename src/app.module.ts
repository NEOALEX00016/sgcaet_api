import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmpresasModule } from './empresas/empresas.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { RolesModule } from './roles/roles.module';
import { PermisosModule } from './permisos/permisos.module';
import { LicenciasEmpresaModule } from './licencias-empresa/licencias-empresa.module';
import { BitacoraAuditoriaSistemaModule } from './bitacora-auditoria-sistema/bitacora-auditoria-sistema.module';
import { Empresa } from './empresas/entities/empresa.entity';
import { Usuario } from './usuarios/entities/usuario.entity';
import { Rol } from './roles/entities/role.entity';
import { Permiso } from './permisos/entities/permiso.entity';
import { LicenciaEmpresa } from './licencias-empresa/entities/licencias-empresa.entity';
import { BitacoraAuditoriaSistema } from './bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { RolPermisosModule } from './rol-permisos/rol-permisos.module';
import { UsuarioRolesModule } from './usuario-roles/usuario-roles.module';
import { RolPermiso } from './rol-permisos/entities/rol-permiso.entity';
import { UsuarioRol } from './usuario-roles/entities/usuario-role.entity';
import { LicenciaSoloLecturaGuard } from './common/guards/licencia-solo-lectura.guard';
import { ActivosModule } from './activos/activos.module';
import { Activo } from './activos/entities/activo.entity';
import { AsignacionesModule } from './asignaciones/asignaciones.module';
import { Asignacion } from './asignaciones/entities/asignacione.entity';
import { AsignacionRecursosModule } from './asignacion-recursos/asignacion-recursos.module';
import { AsignacionRecurso } from './asignacion-recursos/entities/asignacion-recurso.entity';
import { DevolucionesModule } from './devoluciones/devoluciones.module';
import { Devolucion } from './devoluciones/entities/devolucione.entity';
import { CambiosEquipoModule } from './cambios-equipo/cambios-equipo.module';
import { CambioEquipo } from './cambios-equipo/entities/cambios-equipo.entity';
import { LineasTelefonicasModule } from './lineas-telefonicas/lineas-telefonicas.module';
import { LineaTelefonica } from './lineas-telefonicas/entities/lineas-telefonica.entity';
import { BolsasTelecomModule } from './bolsas-telecom/bolsas-telecom.module';
import { AsignacionesBolsaTelecomModule } from './asignaciones-bolsa-telecom/asignaciones-bolsa-telecom.module';
import { PrestamosActivoModule } from './prestamos-activo/prestamos-activo.module';
import { ReparacionesActivoModule } from './reparaciones-activo/reparaciones-activo.module';
import { BolsaTelecom } from './bolsas-telecom/entities/bolsas-telecom.entity';
import { AsignacionBolsaTelecom } from './asignaciones-bolsa-telecom/entities/asignaciones-bolsa-telecom.entity';
import { PrestamoActivo } from './prestamos-activo/entities/prestamos-activo.entity';
import { ReparacionActivo } from './reparaciones-activo/entities/reparaciones-activo.entity';
import { EvidenciasModule } from './evidencias/evidencias.module';
import { Evidencia } from './evidencias/entities/evidencia.entity';
import { FormulariosModule } from './formularios/formularios.module';
import { FormularioVersionesModule } from './formulario-versiones/formulario-versiones.module';
import { FormularioRespuestasModule } from './formulario-respuestas/formulario-respuestas.module';
import { Formulario } from './formularios/entities/formulario.entity';
import { FormularioVersione } from './formulario-versiones/entities/formulario-versione.entity';
import { FormularioRespuesta } from './formulario-respuestas/entities/formulario-respuesta.entity';
import { FormularioRespuestaDetalle } from './formulario-respuestas/entities/formulario-respuesta-detalle.entity';
import { PersonasModule } from './personas/personas.module';
import { DepartamentosModule } from './departamentos/departamentos.module';
import { UbicacionesModule } from './ubicaciones/ubicaciones.module';
import { Persona } from './personas/entities/persona.entity';
import { Departamento } from './departamentos/entities/departamento.entity';
import { Ubicacione } from './ubicaciones/entities/ubicacione.entity';
import { OperadorasModule } from './operadoras/operadoras.module';
import { PlanesTelefonicosModule } from './planes-telefonicos/planes-telefonicos.module';
import { SuscripcionesLineaModule } from './suscripciones-linea/suscripciones-linea.module';
import { Operadora } from './operadoras/entities/operadora.entity';
import { PlanesTelefonico } from './planes-telefonicos/entities/planes-telefonico.entity';
import { TiposActivoModule } from './tipos-activo/tipos-activo.module';
import { IdentificadoresQrActivoModule } from './identificadores-qr-activo/identificadores-qr-activo.module';
import { AtributosDinamicosActivoModule } from './atributos-dinamicos-activo/atributos-dinamicos-activo.module';
import { TiposActivo } from './tipos-activo/entities/tipos-activo.entity';
import { AtributosDinamicosActivo } from './atributos-dinamicos-activo/entities/atributos-dinamicos-activo.entity';
import { IdentificadoresQrActivo } from './identificadores-qr-activo/entities/identificadores-qr-activo.entity';
import { MovimientosTelecomModule } from './movimientos-telecom/movimientos-telecom.module';
import { AuditoriasModule } from './auditorias/auditorias.module';
import { AuditoriaDetallesModule } from './auditoria-detalles/auditoria-detalles.module';
import { MovimientosTelecom } from './movimientos-telecom/entities/movimientos-telecom.entity';
import { Auditoria } from './auditorias/entities/auditoria.entity';
import { AuditoriaDetalle } from './auditoria-detalles/entities/auditoria-detalle.entity';
import { IncidenciasModule } from './incidencias/incidencias.module';
import { Incidencia } from './incidencias/entities/incidencia.entity';
import { AuthModule } from './auth/auth.module';
import { UsuarioIdentidad } from './auth/entities/usuario-identidad.entity';
import { FormularioCamposModule } from './formulario-campos/formulario-campos.module';
import { FormularioReglasModule } from './formulario-reglas/formulario-reglas.module';
import { FormularioCampo } from './formulario-campos/entities/formulario-campo.entity';
import { FormularioRegla } from './formulario-reglas/entities/formulario-regla.entity';
import { EstructuraOrganizacionalNodosModule } from './estructura-organizacional-nodos/estructura-organizacional-nodos.module';
import { FuentesEmpleadosModule } from './fuentes-empleados/fuentes-empleados.module';
import { PersonaEstructuraOrganizacionalModule } from './persona-estructura-organizacional/persona-estructura-organizacional.module';
import { EventosPersonaLaboralModule } from './eventos-persona-laboral/eventos-persona-laboral.module';
import { EjecucionesCargaEmpleadosModule } from './ejecuciones-carga-empleados/ejecuciones-carga-empleados.module';
import { EstructuraOrganizacionalNodo } from './estructura-organizacional-nodos/entities/estructura-organizacional-nodo.entity';
import { FuentesEmpleado } from './fuentes-empleados/entities/fuentes-empleado.entity';
import { PersonaEstructuraOrganizacional } from './persona-estructura-organizacional/entities/persona-estructura-organizacional.entity';
import { EventosPersonaLaboral } from './eventos-persona-laboral/entities/eventos-persona-laboral.entity';
import { EjecucionesCargaEmpleado } from './ejecuciones-carga-empleados/entities/ejecuciones-carga-empleado.entity';
import { MarcasEmpresaModule } from './marcas-empresa/marcas-empresa.module';
import { DominiosEmpresaModule } from './dominios-empresa/dominios-empresa.module';
import { DireccionesEmpresaModule } from './direcciones-empresa/direcciones-empresa.module';
import { EventosLicenciaEmpresaModule } from './eventos-licencia-empresa/eventos-licencia-empresa.module';
import { MarcasEmpresa } from './marcas-empresa/entities/marcas-empresa.entity';
import { DominiosEmpresa } from './dominios-empresa/entities/dominios-empresa.entity';
import { DireccionesEmpresa } from './direcciones-empresa/entities/direcciones-empresa.entity';
import { EventosLicenciaEmpresa } from './eventos-licencia-empresa/entities/eventos-licencia-empresa.entity';
import { MisActivosModule } from './mis-activos/mis-activos.module';
import { SolicitudesModule } from './solicitudes/solicitudes.module';
import { Solicitud } from './solicitudes/entities/solicitud.entity';
import { IntegracionesMesaAyudaModule } from './integraciones-mesa-ayuda/integraciones-mesa-ayuda.module';
import { IntegracionMesaAyuda } from './integraciones-mesa-ayuda/entities/integracion-mesa-ayuda.entity';
import { EventoIntegracionMesaAyuda } from './integraciones-mesa-ayuda/entities/evento-integracion-mesa-ayuda.entity';
import { HealthController } from './health/health.controller';
import { ConfiguracionSolicitudesModule } from './configuracion-solicitudes/configuracion-solicitudes.module';
import { ConfiguracionSolicitudes } from './configuracion-solicitudes/entities/configuracion-solicitudes.entity';
import { CategoriasEquipoModule } from './categorias-equipo/categorias-equipo.module';
import { CategoriaEquipo } from './categorias-equipo/entities/categoria-equipo.entity';
import { DominiosCatalogoActivosModule } from './dominios-catalogo-activos/dominios-catalogo-activos.module';
import { DominioCatalogoActivo } from './dominios-catalogo-activos/entities/dominio-catalogo-activo.entity';
import { EspecificacionesTipoActivoModule } from './especificaciones-tipo-activo/especificaciones-tipo-activo.module';
import { EspecificacionTipoActivo } from './especificaciones-tipo-activo/entities/especificacion-tipo-activo.entity';
import { ConfiguracionOperativaTenantModule } from './configuracion-operativa-tenant/configuracion-operativa-tenant.module';
import { ConfiguracionOperativaTenant } from './configuracion-operativa-tenant/entities/configuracion-operativa-tenant.entity';
import { DocumentsModule } from './documents/documents.module';
import { DocumentEntity } from './documents/entities/document.entity';
import { TiposNodoOrganizacionModule } from './rest/tipos-nodo-organizacion/tipos-nodo-organizacion.module';
import { TiposNodoOrganizacion } from './rest/tipos-nodo-organizacion/entities/tipos-nodo-organizacion.entity';
import { TiposAsignacionModule } from './tipos-asignacion/tipos-asignacion.module';
import { TipoAsignacion } from './tipos-asignacion/entities/tipos-asignacion.entity';
import { PoliticasFormularioAsignacionModule } from './politicas-formulario-asignacion/politicas-formulario-asignacion.module';
import { PoliticaFormularioAsignacion } from './politicas-formulario-asignacion/entities/politicas-formulario-asignacion.entity';
import { ActasAsignacionModule } from './actas-asignacion/actas-asignacion.module';
import { ActaAsignacion } from './actas-asignacion/entities/acta-asignacion.entity';
import { ActaAsignacionRecurso } from './actas-asignacion/entities/acta-asignacion-recurso.entity';
import { OutboxEventoIntegracion } from './outbox-eventos-integracion/entities/outbox-evento-integracion.entity';
import { OutboxEventosIntegracionModule } from './outbox-eventos-integracion/outbox-eventos-integracion.module';
import { ContratosTelecomModule } from './contratos-telecom/contratos-telecom.module';
import { ContratoTelecom } from './contratos-telecom/entities/contratos-telecom.entity';
import { ReglaNegocio } from './reglas-negocio/entities/reglas-negocio.entity';
import { EvaluacionReglaNegocio } from './reglas-negocio/entities/evaluacion-regla-negocio.entity';
import { PoolTelecom } from './pools-telecom/entities/pools-telecom.entity';
import { CapacidadPoolTelecom } from './pools-telecom/entities/capacidades-pool-telecom.entity';
import { PlanComercialTelecom } from './planes-comerciales-telecom/entities/planes-comerciales-telecom.entity';
import { PoliticaRecargaTelecom } from './politicas-recarga-telecom/entities/politicas-recarga-telecom.entity';
import { AsignacionLineaPersona } from './asignaciones-linea-persona/entities/asignaciones-linea-persona.entity';
import { RecargaTelecom } from './recargas-telecom/entities/recargas-telecom.entity';
import { CicloTelecom } from './ciclos-telecom/entities/ciclos-telecom.entity';
import { SuscripcionesLinea } from './suscripciones-linea/entities/suscripciones-linea.entity';
import { ReglasNegocioModule } from './reglas-negocio/reglas-negocio.module';
import { PoolsTelecomModule } from './pools-telecom/pools-telecom.module';
import { PlanesComercialesTelecomModule } from './planes-comerciales-telecom/planes-comerciales-telecom.module';
import { PoliticasRecargaTelecomModule } from './politicas-recarga-telecom/politicas-recarga-telecom.module';
import { AsignacionesLineaPersonaModule } from './asignaciones-linea-persona/asignaciones-linea-persona.module';
import { RecargasTelecomModule } from './recargas-telecom/recargas-telecom.module';
import { CiclosTelecomModule } from './ciclos-telecom/ciclos-telecom.module';
import { HistorialComponentesActivoModule } from './historial-componentes-activo/historial-componentes-activo.module';
import { HistorialComponentesActivo } from './historial-componentes-activo/entities/historial-componentes-activo.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: Number(configService.get<string>('DB_PORT', '5432')),
        username: configService.get<string>('DB_USER', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_NAME', 'sgcaet'),
        schema: configService.get<string>('DB_SCHEMA', 'sgcaet_core'),
        entities: [
          Empresa,
          Usuario,
          Rol,
          Permiso,
          LicenciaEmpresa,
          BitacoraAuditoriaSistema,
          RolPermiso,
          UsuarioRol,
          Activo,
          Asignacion,
          AsignacionRecurso,
          Devolucion,
          CambioEquipo,
          LineaTelefonica,
          BolsaTelecom,
          AsignacionBolsaTelecom,
          PrestamoActivo,
          ReparacionActivo,
          HistorialComponentesActivo,
          Evidencia,
          Formulario,
          FormularioVersione,
          FormularioRespuesta,
          FormularioRespuestaDetalle,
          Persona,
          Departamento,
          Ubicacione,
          Operadora,
          ContratoTelecom,
          ReglaNegocio,
          EvaluacionReglaNegocio,
          PoolTelecom,
          CapacidadPoolTelecom,
          PlanComercialTelecom,
          PoliticaRecargaTelecom,
          AsignacionLineaPersona,
          RecargaTelecom,
          CicloTelecom,
          PlanesTelefonico,
          SuscripcionesLinea,
          TiposActivo,
          AtributosDinamicosActivo,
          IdentificadoresQrActivo,
          MovimientosTelecom,
          Auditoria,
          AuditoriaDetalle,
          Incidencia,
          FormularioCampo,
          FormularioRegla,
          EstructuraOrganizacionalNodo,
          FuentesEmpleado,
          PersonaEstructuraOrganizacional,
          EventosPersonaLaboral,
          EjecucionesCargaEmpleado,
          MarcasEmpresa,
          DominiosEmpresa,
          DireccionesEmpresa,
          EventosLicenciaEmpresa,
          Solicitud,
          UsuarioIdentidad,
          IntegracionMesaAyuda,
          EventoIntegracionMesaAyuda,
          ConfiguracionSolicitudes,
          CategoriaEquipo,
          DominioCatalogoActivo,
          EspecificacionTipoActivo,
          ConfiguracionOperativaTenant,
          DocumentEntity,
          TiposNodoOrganizacion,
          TipoAsignacion,
          PoliticaFormularioAsignacion,
          ActaAsignacion,
          ActaAsignacionRecurso,
          OutboxEventoIntegracion,
        ],
        synchronize: false,
      }),
    }),
    EmpresasModule,
    UsuariosModule,
    RolesModule,
    PermisosModule,
    LicenciasEmpresaModule,
    BitacoraAuditoriaSistemaModule,
    RolPermisosModule,
    UsuarioRolesModule,
    ActivosModule,
    AsignacionesModule,
    AsignacionRecursosModule,
    DevolucionesModule,
    CambiosEquipoModule,
    LineasTelefonicasModule,
    BolsasTelecomModule,
    AsignacionesBolsaTelecomModule,
    PrestamosActivoModule,
    ReparacionesActivoModule,
    EvidenciasModule,
    FormulariosModule,
    FormularioVersionesModule,
    FormularioRespuestasModule,
    PersonasModule,
    DepartamentosModule,
    UbicacionesModule,
    OperadorasModule,
    PlanesTelefonicosModule,
    SuscripcionesLineaModule,
    TiposActivoModule,
    AtributosDinamicosActivoModule,
    IdentificadoresQrActivoModule,
    MovimientosTelecomModule,
    AuditoriasModule,
    AuditoriaDetallesModule,
    IncidenciasModule,
    FormularioCamposModule,
    FormularioReglasModule,
    EstructuraOrganizacionalNodosModule,
    FuentesEmpleadosModule,
    PersonaEstructuraOrganizacionalModule,
    EventosPersonaLaboralModule,
    EjecucionesCargaEmpleadosModule,
    MarcasEmpresaModule,
    DominiosEmpresaModule,
    DireccionesEmpresaModule,
    EventosLicenciaEmpresaModule,
    MisActivosModule,
    SolicitudesModule,
    IntegracionesMesaAyudaModule,
    ConfiguracionSolicitudesModule,
    CategoriasEquipoModule,
    DominiosCatalogoActivosModule,
    EspecificacionesTipoActivoModule,
    ConfiguracionOperativaTenantModule,
    DocumentsModule,
    TiposNodoOrganizacionModule,
    TiposAsignacionModule,
    PoliticasFormularioAsignacionModule,
    ActasAsignacionModule,
    OutboxEventosIntegracionModule,
    ContratosTelecomModule,
    ReglasNegocioModule,
    PoolsTelecomModule,
    PlanesComercialesTelecomModule,
    PoliticasRecargaTelecomModule,
    AsignacionesLineaPersonaModule,
    RecargasTelecomModule,
    CiclosTelecomModule,
    HistorialComponentesActivoModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: LicenciaSoloLecturaGuard,
    },
  ],
})
export class AppModule {}
