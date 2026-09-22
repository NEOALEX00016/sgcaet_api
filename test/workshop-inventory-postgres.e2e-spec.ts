import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

type QueryResult<Row> = { rows: Row[]; rowCount: number };
type DbClient = {
  connect(): Promise<void>;
  end(): Promise<void>;
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>>;
};

// The project ships pg without @types/pg; keep the untyped boundary isolated here.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client } = require('pg') as {
  Client: new (config: Record<string, unknown>) => DbClient;
};

function loadDbConfig() {
  const values: Record<string, string> = {};
  for (const file of ['.env.testing', '.env']) {
    try {
      for (const line of readFileSync(
        join(__dirname, '..', file),
        'utf8',
      ).split(/\r?\n/)) {
        const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
        if (match && values[match[1]] === undefined)
          values[match[1]] = match[2];
      }
    } catch {
      // Environment variables remain the fallback when a local env file is absent.
    }
  }
  return {
    host: process.env.DB_HOST ?? values.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? values.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? values.DB_USER,
    password:
      process.env.SGCAET_DB_PASSWORD ??
      process.env.DB_PASSWORD ??
      values.DB_PASSWORD,
    database: process.env.DB_NAME ?? values.DB_NAME ?? 'sgcaet',
  };
}

describe('Workshop inventory PostgreSQL security and concurrency', () => {
  jest.setTimeout(30_000);
  const ids = {
    tenantA: randomUUID(),
    tenantB: randomUUID(),
    userA: randomUUID(),
    userB: randomUUID(),
    categoryA: randomUUID(),
    typeA: randomUUID(),
    specA: randomUUID(),
    assetA: randomUUID(),
    repairA: randomUUID(),
    repairB: randomUUID(),
    bulkPart: randomUUID(),
    serialPart: randomUUID(),
    stock: randomUUID(),
    unit: randomUUID(),
  };
  const suffix = ids.tenantA.slice(0, 8);
  let admin: DbClient;

  const client = () => new Client(loadDbConfig());

  beforeAll(async () => {
    admin = client();
    await admin.connect();
    await admin.query(
      `DELETE FROM sgcaet_core.usuarios
       WHERE correo LIKE 'workshop-a-%@sgcaet.test'
          OR correo LIKE 'workshop-b-%@sgcaet.test'`,
    );
    await admin.query(
      `DELETE FROM sgcaet_core.empresas
       WHERE nombre_legal LIKE 'Workshop inventory synthetic A %'
          OR nombre_legal LIKE 'Workshop inventory synthetic B %'`,
    );
    await admin.query(
      `INSERT INTO sgcaet_core.empresas
         (id, codigo, nombre_legal, codigo_pais, tipo_identificacion_fiscal,
          numero_identificacion_fiscal, moneda, estado, esta_activa)
       VALUES ($1,$2,$3,'DO','TEST',$4,'DOP','prueba',true),
              ($5,$6,$7,'DO','TEST',$8,'DOP','prueba',true)`,
      [
        ids.tenantA,
        `WIA-${suffix}`,
        `Workshop inventory synthetic A ${suffix}`,
        `WIA-${suffix}`,
        ids.tenantB,
        `WIB-${suffix}`,
        `Workshop inventory synthetic B ${suffix}`,
        `WIB-${suffix}`,
      ],
    );
    await admin.query(
      `INSERT INTO sgcaet_core.usuarios
         (id, empresa_id, correo, nombre_usuario, nombres, apellidos, hash_contrasena, estado)
       VALUES ($1,$2,$3,$4,'Synthetic','A','not-a-login','activo'),
              ($5,$6,$7,$8,'Synthetic','B','not-a-login','activo')`,
      [
        ids.userA,
        ids.tenantA,
        `workshop-a-${suffix}@sgcaet.test`,
        `workshop-a-${suffix}`,
        ids.userB,
        ids.tenantB,
        `workshop-b-${suffix}@sgcaet.test`,
        `workshop-b-${suffix}`,
      ],
    );
    await admin.query(
      `INSERT INTO sgcaet_core.categorias_equipo (id,empresa_id,codigo,nombre)
       VALUES ($1,$2,$3,'Synthetic workshop category')`,
      [ids.categoryA, ids.tenantA, `WIC-${suffix}`],
    );
    await admin.query(
      `INSERT INTO sgcaet_core.tipos_activo
         (id,empresa_id,codigo,nombre,categoria_equipo_id)
       VALUES ($1,$2,$3,'Synthetic workshop type',$4)`,
      [ids.typeA, ids.tenantA, `WIT-${suffix}`, ids.categoryA],
    );
    await admin.query(
      `INSERT INTO sgcaet_core.especificaciones_tipo_activo
         (id,empresa_id,tipo_activo_id,clave,nombre,tipo_dato)
       VALUES ($1,$2,$3,$4,'Synthetic component','texto')`,
      [ids.specA, ids.tenantA, ids.typeA, `component-${suffix}`],
    );
    await admin.query(
      `INSERT INTO sgcaet_core.activos
         (id,empresa_id,tipo_activo_id,codigo_activo,nombre,estado)
       VALUES ($1,$2,$3,$4,'Synthetic workshop asset','en_reparacion')`,
      [ids.assetA, ids.tenantA, ids.typeA, `WIA-ASSET-${suffix}`],
    );
    await admin.query(
      `INSERT INTO sgcaet_core.reparaciones_activo
         (id,empresa_id,activo_id,tipo_servicio,diagnostico,fecha_ingreso,estado,creado_por)
       VALUES ($1,$2,$3,'reparacion','Synthetic A',now(),'abierta',$4),
              ($5,$2,$3,'reparacion','Synthetic B',now(),'cerrada',$4)`,
      [ids.repairA, ids.tenantA, ids.assetA, ids.userA, ids.repairB],
    );
    await admin.query(
      `INSERT INTO sgcaet_core.piezas_repuestos
         (id,empresa_id,especificacion_tipo_activo_id,codigo,nombre_comercial,es_serializado)
       VALUES ($1,$2,$3,$4,'Synthetic bulk part',false),
              ($5,$2,$3,$6,'Synthetic serial part',true)`,
      [
        ids.bulkPart,
        ids.tenantA,
        ids.specA,
        `WIBULK-${suffix}`,
        ids.serialPart,
        `WISERIAL-${suffix}`,
      ],
    );
    await admin.query(
      `INSERT INTO sgcaet_core.existencias_repuestos
         (id,empresa_id,pieza_repuesto_id,cantidad_disponible,cantidad_reservada)
       VALUES ($1,$2,$3,1,0)`,
      [ids.stock, ids.tenantA, ids.bulkPart],
    );
    await admin.query(
      `INSERT INTO sgcaet_core.unidades_repuestos
         (id,empresa_id,pieza_repuesto_id,numero_serie,estado)
       VALUES ($1,$2,$3,$4,'disponible')`,
      [ids.unit, ids.tenantA, ids.serialPart, `WI-SERIAL-${suffix}`],
    );
  });

  afterAll(async () => {
    if (!admin) return;
    for (const table of [
      'existencias_repuestos',
      'unidades_repuestos',
      'piezas_repuestos',
      'reparaciones_activo',
      'activos',
      'especificaciones_tipo_activo',
      'tipos_activo',
      'categorias_equipo',
    ]) {
      await admin.query(
        `DELETE FROM sgcaet_core.${table} WHERE empresa_id = $1`,
        [ids.tenantA],
      );
    }
    await admin.query(
      'DELETE FROM sgcaet_core.usuarios WHERE empresa_id IN ($1,$2)',
      [ids.tenantA, ids.tenantB],
    );
    await admin.query('DELETE FROM sgcaet_core.empresas WHERE id IN ($1,$2)', [
      ids.tenantA,
      ids.tenantB,
    ]);
    const residue = await admin.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM sgcaet_core.empresas
       WHERE id IN ($1,$2)`,
      [ids.tenantA, ids.tenantB],
    );
    expect(residue.rows[0].count).toBe(0);
    await admin.end();
  });

  it('serializes nonserialized reservations so concurrent attempts cannot oversell', async () => {
    const first = client();
    const second = client();
    await Promise.all([first.connect(), second.connect()]);
    try {
      await first.query('BEGIN');
      const before = await first.query<{ cantidad_disponible: string }>(
        `SELECT cantidad_disponible FROM sgcaet_core.existencias_repuestos
         WHERE empresa_id=$1 AND pieza_repuesto_id=$2 FOR UPDATE`,
        [ids.tenantA, ids.bulkPart],
      );
      expect(Number(before.rows[0].cantidad_disponible)).toBe(1);
      await first.query(
        `UPDATE sgcaet_core.existencias_repuestos
         SET cantidad_disponible=cantidad_disponible-1,
             cantidad_reservada=cantidad_reservada+1
         WHERE empresa_id=$1 AND pieza_repuesto_id=$2`,
        [ids.tenantA, ids.bulkPart],
      );

      const secondAttempt = (async () => {
        await second.query('BEGIN');
        const locked = await second.query<{ cantidad_disponible: string }>(
          `SELECT cantidad_disponible FROM sgcaet_core.existencias_repuestos
           WHERE empresa_id=$1 AND pieza_repuesto_id=$2 FOR UPDATE`,
          [ids.tenantA, ids.bulkPart],
        );
        if (Number(locked.rows[0].cantidad_disponible) < 1) {
          await second.query('ROLLBACK');
          return 'rejected';
        }
        await second.query('COMMIT');
        return 'reserved';
      })();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await first.query('COMMIT');

      await expect(secondAttempt).resolves.toBe('rejected');
      const final = await admin.query(
        `SELECT cantidad_disponible,cantidad_reservada
         FROM sgcaet_core.existencias_repuestos WHERE id=$1`,
        [ids.stock],
      );
      expect(final.rows[0]).toMatchObject({
        cantidad_disponible: '0.0000',
        cantidad_reservada: '1.0000',
      });
    } finally {
      await admin.query(
        `UPDATE sgcaet_core.existencias_repuestos
         SET cantidad_disponible=1,cantidad_reservada=0 WHERE id=$1`,
        [ids.stock],
      );
      await Promise.all([first.end(), second.end()]);
    }
  });

  it('prevents a serial unit from being reserved twice under concurrency', async () => {
    const first = client();
    const second = client();
    await Promise.all([first.connect(), second.connect()]);
    try {
      await first.query('BEGIN');
      const available = await first.query<{ estado: string }>(
        `SELECT estado FROM sgcaet_core.unidades_repuestos
         WHERE id=$1 AND empresa_id=$2 FOR UPDATE`,
        [ids.unit, ids.tenantA],
      );
      expect(available.rows[0].estado).toBe('disponible');
      await first.query(
        `UPDATE sgcaet_core.unidades_repuestos
         SET estado='reservada',reparacion_reserva_id=$2 WHERE id=$1`,
        [ids.unit, ids.repairA],
      );
      const secondAttempt = (async () => {
        await second.query('BEGIN');
        const locked = await second.query<{ estado: string }>(
          'SELECT estado FROM sgcaet_core.unidades_repuestos WHERE id=$1 FOR UPDATE',
          [ids.unit],
        );
        await second.query('ROLLBACK');
        return locked.rows[0].estado;
      })();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await first.query('COMMIT');

      await expect(secondAttempt).resolves.toBe('reservada');
    } finally {
      await admin.query(
        `UPDATE sgcaet_core.unidades_repuestos
         SET estado='disponible',reparacion_reserva_id=NULL WHERE id=$1`,
        [ids.unit],
      );
      await Promise.all([first.end(), second.end()]);
    }
  });

  it('rejects cross-tenant references through composite database constraints', async () => {
    await admin.query('BEGIN');
    const expectForeignKeyRejection = async (
      name: string,
      sql: string,
      values: unknown[],
    ) => {
      await admin.query(`SAVEPOINT ${name}`);
      await expect(admin.query(sql, values)).rejects.toMatchObject({
        code: '23503',
      });
      await admin.query(`ROLLBACK TO SAVEPOINT ${name}`);
    };
    try {
      await expectForeignKeyRejection(
        'cross_piece',
        `INSERT INTO sgcaet_core.piezas_repuestos
           (empresa_id,especificacion_tipo_activo_id,codigo,nombre_comercial)
         VALUES ($1,$2,$3,'Cross tenant piece')`,
        [ids.tenantB, ids.specA, `CROSS-${suffix}`],
      );
      await expectForeignKeyRejection(
        'cross_unit',
        `INSERT INTO sgcaet_core.unidades_repuestos
           (empresa_id,pieza_repuesto_id,numero_serie)
         VALUES ($1,$2,$3)`,
        [ids.tenantB, ids.serialPart, `CROSS-SERIAL-${suffix}`],
      );
      await expectForeignKeyRejection(
        'cross_stock',
        `INSERT INTO sgcaet_core.existencias_repuestos
           (empresa_id,pieza_repuesto_id,cantidad_disponible)
         VALUES ($1,$2,1)`,
        [ids.tenantB, ids.bulkPart],
      );
      await expectForeignKeyRejection(
        'cross_movement',
        `INSERT INTO sgcaet_core.movimientos_repuestos
           (empresa_id,pieza_repuesto_id,tipo_movimiento,cantidad,creado_por)
         VALUES ($1,$2,'entrada',1,$3)`,
        [ids.tenantB, ids.bulkPart, ids.userB],
      );
      await expectForeignKeyRejection(
        'cross_component',
        `INSERT INTO sgcaet_core.componentes_instalados_activo
           (empresa_id,activo_id,especificacion_tipo_activo_id,pieza_repuesto_id,
            valor,estado,instalado_por)
         VALUES ($1,$2,$3,$4,'1','instalado',$5)`,
        [ids.tenantB, ids.assetA, ids.specA, ids.bulkPart, ids.userB],
      );
    } finally {
      await admin.query('ROLLBACK');
    }
  });

  it('rejects UPDATE, DELETE and TRUNCATE against the immutable movement ledger', async () => {
    await admin.query('BEGIN');
    try {
      const inserted = await admin.query<{ id: string }>(
        `INSERT INTO sgcaet_core.movimientos_repuestos
           (empresa_id,pieza_repuesto_id,tipo_movimiento,cantidad,creado_por)
         VALUES ($1,$2,'entrada',1,$3) RETURNING id`,
        [ids.tenantA, ids.bulkPart, ids.userA],
      );
      const movementId = inserted.rows[0].id;
      for (const [savepoint, sql, values] of [
        [
          'immutable_update',
          'UPDATE sgcaet_core.movimientos_repuestos SET motivo=$2 WHERE id=$1',
          [movementId, 'mutated'],
        ],
        [
          'immutable_delete',
          'DELETE FROM sgcaet_core.movimientos_repuestos WHERE id=$1',
          [movementId],
        ],
        [
          'immutable_truncate',
          'TRUNCATE TABLE sgcaet_core.movimientos_repuestos',
          [],
        ],
      ] as Array<[string, string, unknown[]]>) {
        await admin.query(`SAVEPOINT ${savepoint}`);
        await expect(admin.query(sql, values)).rejects.toMatchObject({
          code: 'P0001',
        });
        await admin.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
      }
    } finally {
      await admin.query('ROLLBACK');
    }
  });

  it('restores nonserialized and serial balances when reservations are released', async () => {
    await admin.query('BEGIN');
    try {
      await admin.query(
        `UPDATE sgcaet_core.existencias_repuestos
         SET cantidad_disponible=3,cantidad_reservada=0 WHERE id=$1`,
        [ids.stock],
      );
      await admin.query(
        `UPDATE sgcaet_core.existencias_repuestos
         SET cantidad_disponible=cantidad_disponible-2,
             cantidad_reservada=cantidad_reservada+2 WHERE id=$1`,
        [ids.stock],
      );
      await admin.query(
        `INSERT INTO sgcaet_core.movimientos_repuestos
           (empresa_id,pieza_repuesto_id,reparacion_activo_id,tipo_movimiento,cantidad,creado_por)
         VALUES ($1,$2,$3,'reserva',2,$4)`,
        [ids.tenantA, ids.bulkPart, ids.repairA, ids.userA],
      );
      await admin.query(
        `UPDATE sgcaet_core.existencias_repuestos
         SET cantidad_disponible=cantidad_disponible+2,
             cantidad_reservada=cantidad_reservada-2 WHERE id=$1`,
        [ids.stock],
      );
      await admin.query(
        `INSERT INTO sgcaet_core.movimientos_repuestos
           (empresa_id,pieza_repuesto_id,reparacion_activo_id,tipo_movimiento,cantidad,creado_por)
         VALUES ($1,$2,$3,'liberacion',2,$4)`,
        [ids.tenantA, ids.bulkPart, ids.repairA, ids.userA],
      );
      await admin.query(
        `UPDATE sgcaet_core.unidades_repuestos
         SET estado='reservada',reparacion_reserva_id=$2 WHERE id=$1`,
        [ids.unit, ids.repairA],
      );
      await admin.query(
        `UPDATE sgcaet_core.unidades_repuestos
         SET estado='disponible',reparacion_reserva_id=NULL WHERE id=$1`,
        [ids.unit],
      );
      const stock = await admin.query(
        `SELECT cantidad_disponible,cantidad_reservada
         FROM sgcaet_core.existencias_repuestos WHERE id=$1`,
        [ids.stock],
      );
      const unit = await admin.query(
        'SELECT estado,reparacion_reserva_id FROM sgcaet_core.unidades_repuestos WHERE id=$1',
        [ids.unit],
      );
      expect(stock.rows[0]).toMatchObject({
        cantidad_disponible: '3.0000',
        cantidad_reservada: '0.0000',
      });
      expect(unit.rows[0]).toMatchObject({
        estado: 'disponible',
        reparacion_reserva_id: null,
      });
    } finally {
      await admin.query('ROLLBACK');
    }
  });
});
