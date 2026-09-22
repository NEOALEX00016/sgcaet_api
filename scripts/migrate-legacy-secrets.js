const { createCipheriv, createHash, randomBytes } = require('crypto');
const { DataSource } = require('typeorm');

function resolveKey() {
  const configured = process.env.SECRET_ENCRYPTION_KEY || 'sgcaet-local-dev-key';
  const maybeBase64 = Buffer.from(configured, 'base64');
  if (maybeBase64.length === 32 && maybeBase64.toString('base64') === configured) {
    return maybeBase64;
  }
  return createHash('sha256').update(configured, 'utf8').digest();
}

function encrypt(value) {
  if (!value || typeof value !== 'string') return value;
  if (value.startsWith('enc:')) return value;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', resolveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const version = process.env.SECRET_KEY_VERSION || 'v1';
  return `enc:${version}:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

async function migrate() {
  const dryRun = process.argv.includes('--dry-run');
  const schema = process.env.DB_SCHEMA || 'sgcaet_core';
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sgcaet',
    schema,
  });

  await dataSource.initialize();
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  if (!dryRun) {
    await runner.startTransaction();
  }

  try {
    const plan = [
      {
        table: 'configuracion_operativa_tenant',
        pk: 'id',
        columns: ['smtp_contrasena_cifrada', 'almacenamiento_nube_secret_cifrada'],
      },
      {
        table: 'fuentes_empleados',
        pk: 'id',
        columns: ['secreto_cifrado'],
      },
      {
        table: 'integraciones_mesa_ayuda',
        pk: 'id',
        columns: ['auth_config_cifrada'],
      },
    ];

    const summary = [];

    for (const item of plan) {
      const rows = await runner.query(
        `select ${item.pk}, ${item.columns.join(', ')} from ${schema}.${item.table}`,
      );
      let updated = 0;
      for (const row of rows) {
        const payload = {};
        for (const column of item.columns) {
          const value = row[column];
          const encrypted = encrypt(value);
          if (value && encrypted !== value) {
            payload[column] = encrypted;
          }
        }
        const keys = Object.keys(payload);
        if (!keys.length) continue;
        updated += 1;
        if (!dryRun) {
          const sets = keys.map((key, idx) => `${key} = $${idx + 1}`);
          await runner.query(
            `update ${schema}.${item.table} set ${sets.join(', ')} where ${item.pk} = $${keys.length + 1}`,
            [...keys.map((key) => payload[key]), row[item.pk]],
          );
        }
      }
      summary.push(`${item.table}: ${updated}`);
    }

    if (!dryRun) {
      await runner.commitTransaction();
    }
    console.log(`LEGACY_SECRETS_MIGRATION=${dryRun ? 'DRY_RUN' : 'APPLIED'}`);
    console.log(summary.join('\n'));
  } catch (error) {
    if (!dryRun) {
      await runner.rollbackTransaction();
    }
    throw error;
  } finally {
    await runner.release();
    await dataSource.destroy();
  }
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
