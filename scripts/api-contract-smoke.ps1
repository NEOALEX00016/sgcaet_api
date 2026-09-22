param(
  [string]$DbPassword = $env:SGCAET_DB_PASSWORD,
  [string]$BaseUrl = 'http://localhost:4420/v1',
  [string]$DbContainer = 'vapeposrd_db'
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($DbPassword)) {
  $envPath = Join-Path $PSScriptRoot '..\.env'
  if (Test-Path -LiteralPath $envPath) {
    $dbLine = Get-Content -LiteralPath $envPath | Where-Object { $_ -match '^\s*DB_PASSWORD\s*=' } | Select-Object -First 1
    if ($null -ne $dbLine) {
      $DbPassword = ($dbLine -split '=', 2)[1].Trim().Trim('"').Trim("'")
    }
  }
}

if ([string]::IsNullOrWhiteSpace($DbPassword)) {
  throw 'Define SGCAET_DB_PASSWORD, configura DB_PASSWORD en backend/.env o pasa -DbPassword sin guardar el secreto en el repositorio.'
}

$empresaId = '11111111-1111-4111-8111-111111111111'
$usuarioId = '22222222-2222-4222-8222-222222222222'
$licenciaId = '33333333-3333-4333-8333-333333333333'
$rolId = '44444444-4444-4444-8444-444444444444'
$usuarioRolId = '55555555-5555-4555-8555-555555555555'
$rolPermisoIncidenciasVerId = '66666666-6666-4666-8666-666666666661'
$rolPermisoIncidenciasCrearId = '66666666-6666-4666-8666-666666666662'
$rolPermisoIncidenciasEditarId = '66666666-6666-4666-8666-666666666663'
$rolPermisoIncidenciasEliminarId = '66666666-6666-4666-8666-666666666664'
$passwordHash = '$2b$12$HvpOEyv5K50uQBuVeDqrsuQcHqFMJBz.k7F6hnenjZfqfP/e6T3Wi'
$process = $null

function Invoke-Db([string]$Sql) {
  $output = & docker exec -e "PGPASSWORD=$DbPassword" $DbContainer psql -U barrapp -d sgcaet -v ON_ERROR_STOP=1 -At -c $Sql
  if ($LASTEXITCODE -ne 0) {
    throw "SQL smoke setup failed: $Sql"
  }
  return $output
}

function Assert-Status([string]$Method, [string]$Path, [int]$ExpectedStatus, [string]$Token = '', [hashtable]$Body = $null, [bool]$ParseJson = $true) {
  $request = @{
    Method = $Method
    Uri = "$BaseUrl$Path"
    UseBasicParsing = $true
  }
  if (-not [string]::IsNullOrWhiteSpace($Token)) {
    $request.Headers = @{ Authorization = "Bearer $Token" }
  }
  if ($null -ne $Body) {
    $request.ContentType = 'application/json'
    $request.Body = ($Body | ConvertTo-Json -Depth 10)
  }

  try {
    $response = Invoke-WebRequest @request
    if ([int]$response.StatusCode -ne $ExpectedStatus) {
      throw "Expected HTTP $ExpectedStatus but received $($response.StatusCode) for $Method $Path"
    }
    if ($ParseJson -and $response.Content) {
      return ($response.Content | ConvertFrom-Json)
    }
    if (-not $ParseJson) {
      return $response.Content
    }
    return $null
  } catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -ne $ExpectedStatus) {
      throw "Expected HTTP $ExpectedStatus but received $statusCode for $Method $Path. $($_.Exception.Message)"
    }
    return $null
  }
}

try {
  $process = Start-Process -FilePath 'node' -ArgumentList 'dist/main.js' -WorkingDirectory $PSScriptRoot\.. -PassThru
  $ready = $false
  foreach ($attempt in 1..20) {
    Start-Sleep -Milliseconds 500
    try {
      $health = Invoke-WebRequest -Uri "$BaseUrl/" -UseBasicParsing -TimeoutSec 2
      if ([int]$health.StatusCode -eq 200) {
        $ready = $true
        break
      }
    } catch {
      if ($process.HasExited) {
        throw 'Backend process exited before becoming ready.'
      }
    }
  }
  if (-not $ready) {
    throw "Backend did not become ready at $BaseUrl within 10 seconds."
  }

  Assert-Status -Method 'GET' -Path '/' -ExpectedStatus 200 -ParseJson $false | Out-Null

  Invoke-Db "DELETE FROM sgcaet_core.incidencias WHERE empresa_id = '$empresaId'; DELETE FROM sgcaet_core.bitacora_auditoria_sistema WHERE empresa_id = '$empresaId'; DELETE FROM sgcaet_core.rol_permisos WHERE empresa_id = '$empresaId' AND rol_id = '$rolId'; DELETE FROM sgcaet_core.usuario_roles WHERE empresa_id = '$empresaId' AND usuario_id = '$usuarioId'; DELETE FROM sgcaet_core.roles WHERE id = '$rolId'; DELETE FROM sgcaet_core.licencias_empresa WHERE id = '$licenciaId'; DELETE FROM sgcaet_core.usuarios WHERE id = '$usuarioId'; DELETE FROM sgcaet_core.empresas WHERE id = '$empresaId';"
  Invoke-Db "INSERT INTO sgcaet_core.empresas (id,codigo,nombre_legal,codigo_pais,tipo_identificacion_fiscal,numero_identificacion_fiscal,moneda,estado,esta_activa) VALUES ('$empresaId','E2E-API','Empresa E2E API','DO','RNC','E2E-API-001','DOP','activa',true); INSERT INTO sgcaet_core.usuarios (id,empresa_id,correo,nombre_usuario,nombres,apellidos,hash_contrasena,estado) VALUES ('$usuarioId','$empresaId','e2e-api@sgcaet.test','e2e-api','Usuario','E2E','$passwordHash','activo'); INSERT INTO sgcaet_core.licencias_empresa (id,empresa_id,tipo_licencia,estado,inicia_en,vence_en,modo_solo_lectura_al_vencer) VALUES ('$licenciaId','$empresaId','prueba','activa',NOW()-INTERVAL '1 day',NOW()+INTERVAL '1 day',true); INSERT INTO sgcaet_core.roles (id,empresa_id,codigo,nombre,descripcion,es_sistema,esta_activo) VALUES ('$rolId','$empresaId','e2e-incidencias','E2E Incidencias','Rol tecnico para smoke API',false,true); INSERT INTO sgcaet_core.usuario_roles (id,empresa_id,usuario_id,rol_id,asignado_por,asignado_en) VALUES ('$usuarioRolId','$empresaId','$usuarioId','$rolId','$usuarioId',NOW()); INSERT INTO sgcaet_core.rol_permisos (id,empresa_id,rol_id,permiso_id,otorgado_por,otorgado_en) SELECT '$rolPermisoIncidenciasVerId','$empresaId','$rolId',p.id,'$usuarioId',NOW() FROM sgcaet_core.permisos p WHERE p.codigo='incidencias.ver'; INSERT INTO sgcaet_core.rol_permisos (id,empresa_id,rol_id,permiso_id,otorgado_por,otorgado_en) SELECT '$rolPermisoIncidenciasCrearId','$empresaId','$rolId',p.id,'$usuarioId',NOW() FROM sgcaet_core.permisos p WHERE p.codigo='incidencias.crear'; INSERT INTO sgcaet_core.rol_permisos (id,empresa_id,rol_id,permiso_id,otorgado_por,otorgado_en) SELECT '$rolPermisoIncidenciasEditarId','$empresaId','$rolId',p.id,'$usuarioId',NOW() FROM sgcaet_core.permisos p WHERE p.codigo='incidencias.editar'; INSERT INTO sgcaet_core.rol_permisos (id,empresa_id,rol_id,permiso_id,otorgado_por,otorgado_en) SELECT '$rolPermisoIncidenciasEliminarId','$empresaId','$rolId',p.id,'$usuarioId',NOW() FROM sgcaet_core.permisos p WHERE p.codigo='incidencias.eliminar';"

  $login = Assert-Status -Method 'POST' -Path '/auth/login' -ExpectedStatus 201 -Body @{
    correo = 'e2e-api@sgcaet.test'
    contrasena = 'TestPassword123!'
  }
  $token = $login.accessToken
  if ([string]::IsNullOrWhiteSpace($token)) {
    throw 'POST /auth/login did not return an access token.'
  }

  $created = Assert-Status -Method 'POST' -Path '/incidencias' -ExpectedStatus 201 -Token $token -Body @{
    codigo = 'INC-E2E-001'
    titulo = 'Incidencia API real'
    descripcion = 'Registro sintetico para prueba de contrato'
    prioridad = 'alta'
  }
  if ($created.estado -ne 'abierta' -or $created.reportadaPor -ne $usuarioId) {
    throw 'POST /incidencias returned unexpected defaults or actor.'
  }

  $incidenciaId = $created.id
  $list = Assert-Status -Method 'GET' -Path "/incidencias?estado=abierta&prioridad=alta" -ExpectedStatus 200 -Token $token
  if (-not (@($list) | Where-Object { $_.id -eq $incidenciaId })) {
    throw 'GET /incidencias did not return the created tenant-filtered record.'
  }

  $found = Assert-Status -Method 'GET' -Path "/incidencias/$incidenciaId" -ExpectedStatus 200 -Token $token
  if ($found.id -ne $incidenciaId) {
    throw 'GET /incidencias/:id returned an unexpected record.'
  }

  $updated = Assert-Status -Method 'PATCH' -Path "/incidencias/$incidenciaId" -ExpectedStatus 200 -Token $token -Body @{
    titulo = 'Incidencia API actualizada'
    estado = 'en_investigacion'
  }
  if ($updated.estado -ne 'en_investigacion') {
    throw 'PATCH /incidencias/:id did not persist the state change.'
  }

  Assert-Status -Method 'DELETE' -Path "/incidencias/$incidenciaId" -ExpectedStatus 200 -Token $token | Out-Null
  $row = Invoke-Db "SELECT estado || '|' || (cerrada_en IS NOT NULL) FROM sgcaet_core.incidencias WHERE id = '$incidenciaId';"
  if ($row -ne 'cancelada|true') {
    throw "DELETE /incidencias/:id did not persist cancellation: $row"
  }

  Assert-Status -Method 'POST' -Path '/incidencias' -ExpectedStatus 400 -Token $token -Body @{
    codigo = 'INC-E2E-002'
    titulo = 'Debe fallar'
    campoNoPermitido = $true
  } | Out-Null

  $events = Invoke-Db "SELECT COUNT(*) FROM sgcaet_core.bitacora_auditoria_sistema WHERE entidad = 'incidencias' AND entidad_id = '$incidenciaId' AND empresa_id = '$empresaId';"
  if ([int]$events -ne 3) {
    throw "Expected 3 incidence audit events, found $events."
  }

  Write-Output 'API contract smoke passed: GET /, POST/GET/PATCH/DELETE /incidencias, validation 400, PostgreSQL persistence and 3 audit events.'
} finally {
  if ($null -ne $process -and -not $process.HasExited) {
    Stop-Process -Id $process.Id -Force
  }

  try {
    Invoke-Db "DELETE FROM sgcaet_core.incidencias WHERE empresa_id = '$empresaId'; DELETE FROM sgcaet_core.bitacora_auditoria_sistema WHERE empresa_id = '$empresaId'; DELETE FROM sgcaet_core.rol_permisos WHERE empresa_id = '$empresaId' AND rol_id = '$rolId'; DELETE FROM sgcaet_core.usuario_roles WHERE empresa_id = '$empresaId' AND usuario_id = '$usuarioId'; DELETE FROM sgcaet_core.roles WHERE id = '$rolId'; DELETE FROM sgcaet_core.licencias_empresa WHERE id = '$licenciaId'; DELETE FROM sgcaet_core.usuarios WHERE id = '$usuarioId'; DELETE FROM sgcaet_core.empresas WHERE id = '$empresaId';" | Out-Null
  } catch {
    Write-Warning "Smoke cleanup failed: $($_.Exception.Message)"
  }
}
