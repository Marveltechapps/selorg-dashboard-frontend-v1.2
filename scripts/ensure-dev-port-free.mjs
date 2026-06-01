#!/usr/bin/env node
/**
 * If a previous Vite dev server is still listening on the dashboard port, stop it
 * so `npm run dev` does not fail with EADDRINUSE.
 */
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const port = String(process.env.VITE_DEV_PORT || '5173').trim();
const dashboardRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function getListenPids() {
  try {
    const out = execSync(`lsof -iTCP:${port} -sTCP:LISTEN -t`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    return out ? out.split('\n').map((id) => Number(id)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function getCommand(pid) {
  try {
    return execSync(`ps -p ${pid} -o command=`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

for (const pid of getListenPids()) {
  const cmd = getCommand(pid);
  const isDashboardVite =
    cmd.includes('vite') && (cmd.includes(dashboardRoot) || cmd.includes('node_modules/.bin/vite'));

  if (!isDashboardVite) {
    console.warn(
      `[ensure-dev-port] Port ${port} is in use by PID ${pid} (not this project's Vite). Stop it manually or set VITE_DEV_PORT.`
    );
    process.exit(1);
  }

  console.log(`[ensure-dev-port] Stopping stale Vite on port ${port} (PID ${pid})`);
  try {
    process.kill(pid, 'SIGTERM');
  } catch (err) {
    if (err?.code !== 'ESRCH') throw err;
  }
}
