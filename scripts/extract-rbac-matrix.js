const fs = require('fs');
const path = require('path');

const backendSrc = path.resolve(__dirname, '..', 'src');
const workspaceRoot = path.resolve(__dirname, '..', '..');
const docsDir = path.join(workspaceRoot, 'docs');
const csvOut = path.join(docsDir, 'RBAC-001_ROUTE_PERMISSION_MATRIX.csv');
const jsonOut = path.join(docsDir, 'RBAC-001_ROUTE_PERMISSION_SUMMARY.json');

function walkControllers(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walkControllers(filePath));
      continue;
    }
    if (entry.isFile() && filePath.endsWith('.controller.ts')) {
      files.push(filePath);
    }
  }
  return files;
}

function normalizeRoute(basePath, handlerPath) {
  const cleanBase = (basePath || '').replace(/^\/+|\/+$/g, '');
  const cleanHandler = (handlerPath || '').replace(/^\/+|\/+$/g, '');
  const withBase = cleanBase ? `/v1/${cleanBase}` : '/v1';
  const full = cleanHandler ? `${withBase}/${cleanHandler}` : withBase;
  return full.replace(/\/+/g, '/');
}

function csvEscape(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function isDecoratorLine(line) {
  return /^\s*@/.test(line);
}

function isHttpDecoratorLine(line) {
  return /@(Get|Post|Patch|Delete|Put)\(/.test(line);
}

function collectDecoratorContext(lines, httpDecoratorIndex) {
  const contextLines = [lines[httpDecoratorIndex]];
  let down = httpDecoratorIndex + 1;

  while (down < lines.length) {
    const trimmed = lines[down].trim();
    if (trimmed.startsWith('@')) {
      const decoratorLines = [lines[down]];
      let balance =
        (lines[down].match(/\(/g) ?? []).length -
        (lines[down].match(/\)/g) ?? []).length;
      down += 1;
      while (down < lines.length && balance > 0) {
        decoratorLines.push(lines[down]);
        balance += (lines[down].match(/\(/g) ?? []).length;
        balance -= (lines[down].match(/\)/g) ?? []).length;
        down += 1;
      }
      contextLines.push(...decoratorLines);
      continue;
    }
    if (!trimmed) {
      down += 1;
      continue;
    }
    break;
  }

  return contextLines;
}

const files = walkControllers(backendSrc).sort();
const rows = [];
const missingControllers = new Set();

let totalRoutes = 0;
let publicRoutes = 0;
let protectedWithPolicy = 0;
let protectedMissingPolicy = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const classIndex = content.search(/export\s+class\s+\w+Controller\b/);
  const preClass = classIndex >= 0 ? content.slice(0, classIndex) : content;
  const classPermissionMatches = [
    ...preClass.matchAll(/@Require(?:Any)?Permissions?\(([^)]*)\)/g),
  ];
  const classPermission = classPermissionMatches.length
    ? [
        ...classPermissionMatches[
          classPermissionMatches.length - 1
        ][1].matchAll(/'([^']+)'/g),
      ]
        .map((match) => match[1])
        .join(' & ')
    : '';
  const classPublic = /@Public\(\)/.test(preClass);

  const baseMatch = content.match(/@Controller\(([^)]*)\)/);
  const basePath = baseMatch ? baseMatch[1].replace(/["']/g, '').trim() : '';
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const methodMatch = lines[i].match(
      /@(Get|Post|Patch|Delete|Put)\(([^)]*)\)/,
    );
    if (!methodMatch) continue;

    totalRoutes += 1;

    const method = methodMatch[1].toUpperCase();
    const handlerRoute = (methodMatch[2] || '').replace(/["']/g, '').trim();
    const contextLines = collectDecoratorContext(lines, i);

    let up = i - 1;
    while (
      up >= 0 &&
      isDecoratorLine(lines[up]) &&
      !isHttpDecoratorLine(lines[up])
    ) {
      contextLines.unshift(lines[up]);
      up -= 1;
    }

    const context = contextLines.join('\n');

    const methodPermissionMatch = context.match(
      /@Require(Any)?Permissions?\(([^)]*)\)/s,
    );
    const methodPermission = methodPermissionMatch
      ? [...methodPermissionMatch[2].matchAll(/'([^']+)'/g)]
          .map((match) => match[1])
          .join(methodPermissionMatch[1] ? ' | ' : ' & ')
      : '';
    const bodyFieldPermissionMatch = context.match(
      /@RequireBodyFieldPermissions\((\{[\s\S]*?\})\)/,
    );
    const bodyFieldPermission = bodyFieldPermissionMatch
      ? [...bodyFieldPermissionMatch[1].matchAll(/(\w+):\s*\[([^\]]+)\]/g)]
          .map((field) => {
            const permissions = [...field[2].matchAll(/'([^']+)'/g)]
              .map((match) => match[1])
              .join(' | ');
            return `${field[1]}=>(${permissions})`;
          })
          .join('; ')
      : '';
    const isPublic = classPublic || /@Public\(\)/.test(context);
    const permission = isPublic
      ? 'PUBLIC'
      : methodPermission || bodyFieldPermission || classPermission || 'MISSING_POLICY';

    if (isPublic) {
      publicRoutes += 1;
    } else if (permission === 'MISSING_POLICY') {
      protectedMissingPolicy += 1;
      missingControllers.add(
        path.relative(backendSrc, file).replace(/\\/g, '/'),
      );
    } else {
      protectedWithPolicy += 1;
    }

    rows.push({
      file: path.relative(backendSrc, file).replace(/\\/g, '/'),
      controllerBase: basePath || '(root)',
      method,
      handlerRoute: handlerRoute || '(root)',
      finalRoute: normalizeRoute(basePath, handlerRoute),
      access: isPublic ? 'PUBLIC' : 'PROTECTED',
      permission,
    });
  }
}

const csvHeader =
  'file,controller_base,method,handler_route,final_route,access,permission\n';
const csvBody = rows
  .map((row) =>
    [
      row.file,
      row.controllerBase,
      row.method,
      row.handlerRoute,
      row.finalRoute,
      row.access,
      row.permission,
    ]
      .map(csvEscape)
      .join(','),
  )
  .join('\n');

const summary = {
  controllers: files.length,
  totalRoutes,
  publicRoutes,
  protectedWithPolicy,
  protectedMissingPolicy,
  missingControllers: [...missingControllers].sort(),
};

fs.writeFileSync(csvOut, `${csvHeader}${csvBody}\n`, 'utf8');
fs.writeFileSync(jsonOut, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

console.log(JSON.stringify(summary, null, 2));
