// Scans src/**/*.controller.ts and prints TS for MASTER_PERMISSION_SEED.
// Run: node scripts/generate-endpoint-seed.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, '..', 'src');

const rbacModuleByPath = (relPath) => {
  const p = relPath.replace(/\\/g, '/');
  if (p.includes('app.controller')) return 'APP';
  if (p.includes('/rbac/')) return 'RBAC';
  if (p.includes('/account-creation/')) return 'ADMIN_MANAGEMENT';
  if (p.includes('/admin/')) return 'ADMIN_MANAGEMENT';
  if (p.includes('/auditor/')) return 'INTERNAL_AUDIT';
  if (p.includes('/haccp/')) return 'FOOD_SAFETY';
  if (p.includes('/hr/supplier')) return 'SUPPLIER_MANAGEMENT';
  if (p.includes('/hr/')) return 'COMPETENCY_MANAGEMENT';
  if (p.includes('/internal-audit/')) return 'INTERNAL_AUDIT';
  if (p.includes('/management-rev/')) return 'REVIEW_MEETINGS';
  if (p.includes('/tech/')) return 'MAINTENANCE_PROGRAM';
  return 'UNKNOWN';
};

const resourceFromController = (name) => {
  const base = name
    .replace(/Controller$/, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase();
  return base.replace(/[^a-z0-9_]/g, '_');
};

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, acc);
    else if (ent.name.endsWith('.controller.ts')) acc.push(full);
  }
  return acc;
}

function parseController(filePath, text) {
  const ctrlMatch = text.match(/@Controller\s*\(\s*(?:['"]([^'"]*)['"])?\s*\)/);
  const prefix = ctrlMatch && ctrlMatch[1] !== undefined ? ctrlMatch[1] : '';
  const basePrefix = prefix ? `/${prefix}` : '';

  const re = /@(Get|Post|Put|Patch|Delete)\s*\(\s*(?:['"]([^'"]*)['"])?\s*\)/g;

  let m;
  const routes = [];
  while ((m = re.exec(text)) !== null) {
    const method = m[1].toUpperCase();
    const sub = m[2] ?? '';
    const fullPath =
      (basePrefix + '/' + sub).replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    routes.push({
      method,
      path: fullPath === '/' && basePrefix ? basePrefix : fullPath,
    });
  }

  const seen = new Set();
  const uniq = [];
  for (const r of routes) {
    const k = `${r.method} ${r.path}`;
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(r);
  }
  return { basePrefix: basePrefix || '/', routes: uniq };
}

function actionFrom(method, path) {
  const p = path.toLowerCase();
  if (method === 'DELETE') return 'delete';
  if (method === 'GET') return 'view';
  if (method === 'POST') {
    if (/login|signin|auth/.test(p)) return 'auth';
    return 'create';
  }
  if (method === 'PUT' || method === 'PATCH') {
    if (/disapprove/.test(p)) return 'disapprove';
    if (/approve/.test(p) && !/get-approved|getapproved/.test(p))
      return 'approve';
    if (/reject/.test(p)) return 'reject';
    if (
      /\/review|review-/.test(p) ||
      /reviewform|review-document|review-changerequest|review_uploaded/.test(p)
    )
      return 'review';
    if (/verify/.test(p)) return 'verify';
    if (/comment/.test(p) || /addcomment/.test(p)) return 'comment';
    if (/acceptmwr|\/accept/.test(p)) return 'accept';
    if (/completemwr|\/complete/.test(p)) return 'complete';
    return 'edit';
  }
  return 'manage';
}

function keyFrom(method, path) {
  const norm = path
    .replace(/^\//, '')
    .replace(/[{}]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return `${method}_${norm || 'ROOT'}`.toUpperCase();
}

const files = walk(srcRoot).sort();
const rows = [];

for (const fp of files) {
  const rel = path.relative(path.join(__dirname, '..'), fp);
  const text = fs.readFileSync(fp, 'utf8');
  const nameMatch = text.match(/export class (\w+Controller)/);
  const ctrlName = nameMatch ? nameMatch[1] : 'UnknownController';
  let resource = resourceFromController(ctrlName);
  const moduleKey = rbacModuleByPath(rel);
  if (moduleKey === 'SUPPLIER_MANAGEMENT') resource = 'supplier';
  const { routes } = parseController(fp, text);

  for (const r of routes) {
    const k = keyFrom(r.method, r.path);
    const action = actionFrom(r.method, r.path);
    const desc = `${r.method} ${r.path}`;
    rows.push({
      moduleKey,
      resource,
      action,
      key: `EP_${k}`,
      description: desc,
      method: r.method,
      path: r.path.startsWith('/') ? r.path : `/${r.path}`,
    });
  }
}

const json = rows.map(
  (o) =>
    `  { moduleKey: '${o.moduleKey}', resource: '${o.resource}', action: '${o.action}', key: '${o.key}', description: '${o.description.replace(/'/g, "\\'")}', method: '${o.method}', path: '${o.path}' },`,
);

console.log('export const MASTER_PERMISSION_SEED = [');
console.log(json.join('\n'));
console.log('] as const;');
