import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const routesPath = path.join(root, 'scripts', 'secured-routes.json');
const seedPath = path.join(root, 'src', 'rbac', 'constants', 'master-access.seed.ts');

const routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
const map = new Map(routes.map((r) => [r.key, r]));

function tsQuote(s) {
  return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

const lines = fs.readFileSync(seedPath, 'utf8').split(/\r?\n/);
const out = [];
let patched = 0;
const missingInControllers = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const km = line.match(/^(\s*)key:\s*'([^']+)'\s*,?\s*$/);
  if (!km) {
    out.push(line);
    continue;
  }
  const indent = km[1];
  const permKey = km[2];
  const r = map.get(permKey);
  out.push(line);
  if (!r) {
    missingInControllers.push(permKey);
    continue;
  }

  let j = i + 1;
  let touched = 0;
  while (j < lines.length && j < i + 40) {
    const L = lines[j];
    if (/^\s*\},\s*$/.test(L)) {
      out.push(L);
      j++;
      break;
    }
    if (/^\s*description:\s*/.test(L)) {
      out.push(`${indent}description: ${tsQuote(`${r.method} ${r.path}`)},`);
      touched++;
      // Skip legacy duplicate description line (continuation string without key)
      const next = lines[j + 1];
      if (
        next &&
        /^\s+'(GET|POST|PUT|PATCH|DELETE)\s+\//.test(next)
      ) {
        j++;
      }
    } else if (/^\s*method:\s*/.test(L)) {
      out.push(`${indent}method: ${tsQuote(r.method)},`);
      touched++;
    } else if (/^\s*path:\s*/.test(L)) {
      out.push(`${indent}path: ${tsQuote(r.path)},`);
      touched++;
    } else {
      out.push(L);
    }
    j++;
  }
  if (touched === 3) patched++;
  i = j - 1;
}

fs.writeFileSync(seedPath, out.join('\n'));
console.log('Patched entries (description+method+path):', patched);
console.log('Keys in seed not found on controllers:', missingInControllers.length);
if (missingInControllers.length && missingInControllers.length <= 40) {
  console.log(missingInControllers.join('\n'));
} else if (missingInControllers.length) {
  console.log(missingInControllers.slice(0, 30).join('\n'), '...');
}

const seedKeys = [...lines.join('\n').matchAll(/key:\s*'([^']+)'/g)].map((m) => m[1]);
const inSeedNotMap = [...new Set(seedKeys)].filter((k) => !map.has(k));
const inMapNotSeed = [...map.keys()].filter((k) => !seedKeys.includes(k));
console.log('Unique keys in seed:', new Set(seedKeys).size);
console.log('In seed, not in controller map:', inSeedNotMap.length);
console.log('In controller map, not in seed:', inMapNotSeed.length);
if (inMapNotSeed.length && inMapNotSeed.length <= 25) {
  console.log(inMapNotSeed.join('\n'));
}
