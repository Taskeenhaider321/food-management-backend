import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function walk(dir, acc = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) {
      if (f.name !== 'node_modules' && f.name !== 'dist') walk(p, acc);
    } else if (f.name.endsWith('.controller.ts')) acc.push(p);
  }
  return acc;
}

function joinPath(base, sub) {
  const b = '/' + base.replace(/^\/+|\/+$/g, '');
  const s = sub ? '/' + String(sub).replace(/^\/+/, '') : '';
  return (b + s).replace(/\/+/g, '/') || '/';
}

/** Extract @SecuredEndpoint(...) block starting at line index `i` (line contains @SecuredEndpoint). */
function parseSecuredEndpointBlock(lines, i) {
  let depth = 0;
  let buf = '';
  let k = i;
  const max = Math.min(lines.length, i + 100);
  for (; k < max; k++) {
    const L = lines[k];
    buf += L + '\n';
    for (let c = 0; c < L.length; c++) {
      const ch = L[c];
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0 && buf.includes('@SecuredEndpoint')) {
          const start = buf.indexOf('@SecuredEndpoint');
          const open = buf.indexOf('(', start);
          const inner = buf.slice(open + 1, buf.lastIndexOf(')'));
          const strings = [];
          const re = /'([^']*)'|"([^"]*)"/g;
          let m;
          while ((m = re.exec(inner)) !== null) {
            strings.push((m[1] ?? m[2]).trim());
          }
          if (strings.length < 2) return null;
          const moduleKey = strings[0];
          const permKeys = strings.slice(1);
          return { moduleKey, permKeys, endLine: k };
        }
      }
    }
    if (/^\s*async\s+\w+/.test(L) && depth <= 0 && k > i) break;
  }
  return null;
}

function findSecuredAfterHttp(lines, httpLineIndex) {
  let j = httpLineIndex + 1;
  const max = Math.min(lines.length, httpLineIndex + 120);
  while (j < max) {
    if (/^\s*async\s+\w+/.test(lines[j])) return null;
    if (lines[j].includes('@SecuredEndpoint')) {
      return parseSecuredEndpointBlock(lines, j);
    }
    j++;
  }
  return null;
}

const files = walk(path.join(root, 'src'));
const byKey = new Map();

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const ctrl = text.match(/@Controller\(\s*['"]([^'"]*)['"]\s*\)/);
  const base = ctrl ? ctrl[1] : null;
  if (base === null) continue;

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const httpMatch = line.match(/^\s*@(Get|Post|Put|Patch|Delete)\(([^)]*)\)\s*$/);
    if (!httpMatch) continue;
    const method = httpMatch[1].toUpperCase();
    let sub = httpMatch[2].replace(/['"]/g, '').trim();

    const parsed = findSecuredAfterHttp(lines, i);
    if (!parsed) continue;
    const { moduleKey, permKeys } = parsed;
    const full = joinPath(base, sub);
    for (const permKey of permKeys) {
      if (!permKey.startsWith('EP_')) continue;
      byKey.set(permKey, {
        key: permKey,
        moduleKey,
        method,
        path: full,
        file: path.relative(root, file),
      });
    }
  }
}

const out = path.join(root, 'scripts', 'secured-routes.json');
fs.writeFileSync(
  out,
  JSON.stringify(
    [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key)),
    null,
    2,
  ),
);
console.log('Wrote', out, 'count', byKey.size);
