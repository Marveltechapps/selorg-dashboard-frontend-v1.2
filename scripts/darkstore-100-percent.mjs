#!/usr/bin/env node
/**
 * Darkstore 100%: screens §5.2 + flows D1–D9
 * Usage: SMOKE_FRONTEND=http://127.0.0.1:5174 node scripts/darkstore-100-percent.mjs
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

console.log('=== Darkstore 100%: flows D1–D9 ===');
run('darkstore-flows-full.mjs');
console.log('\n=== Darkstore 100%: screens §5.2 ===');
const r = spawnSync(node, [join(__dirname, 'darkstore-smoke-phase-b.mjs')], {
  cwd: join(__dirname, '..'),
  env: { ...env, DARKSTORE_SCREENS_ONLY: '1' },
  stdio: 'inherit',
});
if (r.status !== 0) process.exit(r.status ?? 1);
console.log('\nDarkstore 100% complete.');
