#!/usr/bin/env node
/**
 * Production dashboard verification — seed + flows P1–P10.
 * Usage: SMOKE_FRONTEND=http://127.0.0.1:5173 node scripts/production-100-percent.mjs
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

console.log('=== Production 100%: seed + flows P1–P10 ===');
run('production-flows-full.mjs');
console.log('\nProduction verification complete.');
