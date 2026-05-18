#!/usr/bin/env node
/**
 * Admin dashboard 100% verification:
 * 1. Seed flow data (OT + shift-change)
 * 2. Browser flows A1–A10
 * 3. All §5.1 screens
 *
 * Usage: SMOKE_FRONTEND=http://127.0.0.1:5174 node scripts/admin-100-percent.mjs
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

console.log('=== Admin 100%: flows A1–A10 ===');
run('admin-flows-full.mjs');
console.log('\n=== Admin 100%: screens §5.1 ===');
run('admin-smoke-complete.mjs');
console.log('\nAdmin 100% complete.');
