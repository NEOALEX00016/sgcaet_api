#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function parseArgs(argv) {
  const args = {
    entities: ['Persona'],
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  if (typeof args.entities === 'string') {
    args.entities = args.entities
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return args;
}

function loadEnvFile(envPath) {
  const env = {};
  if (!fs.existsSync(envPath)) return env;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function getAllEntityFiles(rootDir) {
  const files = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.entity.ts')) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function extractOptionValue(argsText, key) {
  const pattern = new RegExp(`${key}\\s*:\\s*'([^']+)'`);
  const match = argsText.match(pattern);
  return match ? match[1] : null;
}

function hasOptionTrue(argsText, key) {
  const pattern = new RegExp(`${key}\\s*:\\s*true`);
  return pattern.test(argsText);
}

function inferTypeFromDecorator(decoratorName, argsText, tsType) {
  if (decoratorName === 'PrimaryGeneratedColumn') {
    if ((argsText || '').includes("'uuid'") || (argsText || '').includes('"uuid"')) {
      return 'uuid';
    }
    return 'integer';
  }

  if (decoratorName === 'CreateDateColumn' || decoratorName === 'UpdateDateColumn' || decoratorName === 'DeleteDateColumn') {
    return 'timestamptz';
  }

  const explicitType = extractOptionValue(argsText || '', 'type');
  if (explicitType) {
    return explicitType;
  }

  const normalizedTsType = (tsType || '').trim();
  if (normalizedTsType === 'string') return 'varchar';
  if (normalizedTsType === 'boolean') return 'boolean';
  if (normalizedTsType === 'number') return 'integer';
  if (normalizedTsType === 'Date') return 'timestamptz';
  if (normalizedTsType.includes('Record') || normalizedTsType.includes('{')) return 'jsonb';
  return null;
}

function parseEntityMetadata(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const classMatch = source.match(/export\s+class\s+(\w+)/);
  const entityMatch = source.match(/@Entity\('([^']+)'\)/);
  if (!classMatch || !entityMatch) return null;

  const className = classMatch[1];
  const tableName = entityMatch[1];

  const propertyRegex = /((?:@[A-Za-z0-9_]+(?:\([^)]*\))?\s*)+)\s*([A-Za-z0-9_]+)\??:\s*([^;]+);/gms;
  const columns = [];
  let match;
  while ((match = propertyRegex.exec(source)) !== null) {
    const decorators = match[1];
    const propertyName = match[2];
    const tsType = match[3];
    const decoratorMatch = decorators.match(
      /@(PrimaryGeneratedColumn|Column|CreateDateColumn|UpdateDateColumn|DeleteDateColumn)\(([^)]*)\)/s,
    );
    if (!decoratorMatch) continue;

    const decoratorName = decoratorMatch[1];
    const decoratorArgs = decoratorMatch[2] || '';
    const columnName = extractOptionValue(decoratorArgs, 'name') || propertyName;
    const columnType = inferTypeFromDecorator(decoratorName, decoratorArgs, tsType);
    const nullable = hasOptionTrue(decoratorArgs, 'nullable') || decoratorName === 'DeleteDateColumn';

    columns.push({
      propertyName,
      columnName,
      expectedType: columnType,
      nullable,
      source: decoratorName,
    });
  }

  return {
    className,
    tableName,
    filePath,
    columns,
  };
}

function normalizeType(type) {
  const raw = (type || '').toLowerCase().trim();
  if (!raw) return null;
  const map = {
    'character varying': 'varchar',
    character: 'char',
    bpchar: 'char',
    varchar: 'varchar',
    text: 'text',
    uuid: 'uuid',
    boolean: 'boolean',
    bool: 'boolean',
    integer: 'integer',
    int4: 'integer',
    bigint: 'bigint',
    int8: 'bigint',
    numeric: 'numeric',
    'timestamp with time zone': 'timestamptz',
    timestamptz: 'timestamptz',
    jsonb: 'jsonb',
    json: 'json',
    date: 'date',
  };
  return map[raw] || raw;
}

async function loadDbColumns(client, schemaName, tableName) {
  const query = `
    SELECT
      column_name,
      data_type,
      udt_name,
      is_nullable
    FROM information_schema.columns
    WHERE table_schema = $1
      AND table_name = $2
    ORDER BY ordinal_position;
  `;
  const result = await client.query(query, [schemaName, tableName]);
  return result.rows.map((row) => ({
    columnName: row.column_name,
    actualType: normalizeType(row.data_type === 'USER-DEFINED' ? row.udt_name : row.data_type),
    nullable: row.is_nullable === 'YES',
  }));
}

function applyInjectedMismatch(entityMeta, injectedSpec) {
  if (!injectedSpec) return;
  const parts = injectedSpec.split(':').map((value) => value.trim());
  if (parts.length < 3) {
    throw new Error('--inject-mismatch must use format table:column:type');
  }
  const [tableName, columnName, expectedType] = parts;
  if (entityMeta.tableName !== tableName) return;
  entityMeta.columns.push({
    propertyName: '__injected__',
    columnName,
    expectedType,
    nullable: false,
    source: 'InjectedMismatch',
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = path.resolve(__dirname, '..');
  const envFile = loadEnvFile(path.join(projectRoot, '.env'));

  const dbConfig = {
    host: args['db-host'] || process.env.DB_HOST || envFile.DB_HOST || 'localhost',
    port: Number(args['db-port'] || process.env.DB_PORT || envFile.DB_PORT || '5432'),
    user: args['db-user'] || process.env.DB_USER || envFile.DB_USER || 'postgres',
    password: args['db-password'] || process.env.DB_PASSWORD || envFile.DB_PASSWORD || '',
    database: args['db-name'] || process.env.DB_NAME || envFile.DB_NAME || 'sgcaet',
    schema: args['db-schema'] || process.env.DB_SCHEMA || envFile.DB_SCHEMA || 'sgcaet_core',
  };

  if (!dbConfig.password) {
    throw new Error('DB password is required. Provide --db-password or DB_PASSWORD in environment/.env');
  }

  const entityFiles = getAllEntityFiles(path.join(projectRoot, 'src'));
  const parsedEntities = entityFiles
    .map((filePath) => parseEntityMetadata(filePath))
    .filter(Boolean)
    .reduce((acc, entity) => {
      acc[entity.className] = entity;
      return acc;
    }, {});

  const selectedEntities = args.entities;
  const issues = [];

  const client = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
  });

  await client.connect();
  try {
    for (const entityName of selectedEntities) {
      const entityMeta = parsedEntities[entityName];
      if (!entityMeta) {
        issues.push({
          entity: entityName,
          severity: 'error',
          message: `Entity class not found: ${entityName}`,
        });
        continue;
      }

      applyInjectedMismatch(entityMeta, args['inject-mismatch']);

      const dbColumns = await loadDbColumns(client, dbConfig.schema, entityMeta.tableName);
      if (dbColumns.length === 0) {
        issues.push({
          entity: entityName,
          severity: 'error',
          message: `Table not found in schema ${dbConfig.schema}: ${entityMeta.tableName}`,
        });
        continue;
      }

      const dbByName = new Map(dbColumns.map((column) => [column.columnName, column]));
      const entityColumnNames = new Set(entityMeta.columns.map((column) => column.columnName));
      for (const expected of entityMeta.columns) {
        const actual = dbByName.get(expected.columnName);
        if (!actual) {
          issues.push({
            entity: entityName,
            table: entityMeta.tableName,
            column: expected.columnName,
            severity: 'error',
            message: `Missing column in DB: ${entityMeta.tableName}.${expected.columnName}`,
          });
          continue;
        }

        const expectedType = normalizeType(expected.expectedType);
        if (expectedType && actual.actualType && expectedType !== actual.actualType) {
          issues.push({
            entity: entityName,
            table: entityMeta.tableName,
            column: expected.columnName,
            severity: 'error',
            message: `Type mismatch ${entityMeta.tableName}.${expected.columnName}: entity=${expectedType} db=${actual.actualType}`,
          });
        }
      }

      for (const actual of dbColumns) {
        if (!entityColumnNames.has(actual.columnName)) {
          issues.push({
            entity: entityName,
            table: entityMeta.tableName,
            column: actual.columnName,
            severity: 'error',
            message: `Column exists in DB but not in entity: ${entityMeta.tableName}.${actual.columnName}`,
          });
        }
      }
    }
  } finally {
    await client.end();
  }

  const output = {
    database: dbConfig.database,
    schema: dbConfig.schema,
    entitiesChecked: selectedEntities,
    issueCount: issues.length,
    issues,
  };

  if (issues.length > 0) {
    console.error(JSON.stringify(output, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
