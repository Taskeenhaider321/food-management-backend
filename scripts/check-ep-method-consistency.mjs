import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const METHOD_PREFIX = {
  GET: 'EP_GET_',
  POST: 'EP_POST_',
  PUT: 'EP_PUT_',
  PATCH: 'EP_PATCH_',
  DELETE: 'EP_DELETE_',
};

function walk(dir, acc = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) {
      if (f.name !== 'node_modules' && f.name !== 'dist') walk(p, acc);
    } else if (f.name.endsWith('.controller.ts')) acc.push(p);
  }
  return acc;
}

function parseSecuredBlock(lines, i) {
  let depth = 0;
  let buf = '';
  let k = i;
  const max = Math.min(lines.length, i + 100);
  for (; k < max; k++) {
    const L = lines[k];
    buf += L + '\n';
    for (const ch of L) {
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
          return { moduleKey: strings[0], permKeys: strings.slice(1) };
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
      return parseSecuredBlock(lines, j);
    }
    j++;
  }
  return null;
}

const files = walk(path.join(root, 'src'));
const mismatches = [];

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('@SecuredEndpoint')) continue;
  const lines = text.split(/\r?\n/);
  const rel = path.relative(root, file);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const httpMatch = line.match(/^\s*@(Get|Post|Put|Patch|Delete)\(([^)]*)\)\s*$/);
    if (!httpMatch) continue;
    const method = httpMatch[1].toUpperCase();
    const expectedPrefix = METHOD_PREFIX[method];
    const parsed = findSecuredAfterHttp(lines, i);
    if (!parsed) continue;
    for (const key of parsed.permKeys) {
      if (!key.startsWith('EP_')) continue;
      const km = key.match(/^EP_(GET|POST|PUT|PATCH|DELETE)_/);
      if (!km) continue;
      const keyPrefix = `EP_${km[1]}_`;
      if (keyPrefix !== expectedPrefix) {
        mismatches.push({
          file: rel,
          httpMethod: method,
          key,
          keyPrefix,
          expectedPrefix,
        });
      }
    }
  }
}

console.log(JSON.stringify(mismatches, null, 2));
console.error('Total mismatches:', mismatches.length);
