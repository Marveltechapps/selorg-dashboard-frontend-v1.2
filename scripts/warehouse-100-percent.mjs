#!/usr/bin/env node
/**
 * Warehouse dashboard verification — seed + all 17 nav screens + key mutations.
 * Usage: SMOKE_FRONTEND=http://127.0.0.1:5173 node scripts/warehouse-100-percent.mjs
 */
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const node = process.execPath;
const env = { ...process.env };

function run(script) {
  const r = spawnSync(node, [join(__dirname, script)], { cwd: join(__dirname, '..'), env, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log('=== Warehouse 100%: seed + flows W1–W17 ===');
run('warehouse-flows-full.mjs');
console.log('\nWarehouse verification complete.');
