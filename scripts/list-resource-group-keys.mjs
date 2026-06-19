import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, '..', 'src', 'rbac', 'constants', 'master-access.seed.ts');
const text = fs.readFileSync(seedPath, 'utf8');
const start = text.indexOf('export const MASTER_PERMISSION_SEED');
const sub = text.slice(start);
const end = sub.indexOf('] as const');
const block = end === -1 ? sub : sub.slice(0, end);
const pairs = new Set();
let currentModule = null;
for (const line of block.split(/\r?\n/)) {
  const mk = line.match(/moduleKey:\s*'([^']+)'/);
  if (mk) currentModule = mk[1];
  const res = line.match(/resource:\s*'([^']+)'/);
  if (res && currentModule) {
    pairs.add(`${currentModule}:${res[1]}`);
  }
}
for (const k of [...pairs].sort()) console.log(k);
