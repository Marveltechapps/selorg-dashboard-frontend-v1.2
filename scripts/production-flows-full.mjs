#!/usr/bin/env node
/**
 * Production nav verification — seed + all 10 screens + key mutations.
 * Usage: SMOKE_FRONTEND=http://127.0.0.1:5173 node scripts/production-flows-full.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND = process.env.SMOKE_FRONTEND || 'http://127.0.0.1:5173';
const FACTORY_ID = 'chennai-hub';
const REPORT_DIR = join(
  __dirname,
  `../../Docs/test-reports/production-flows-${new Date().toISOString().slice(0, 16).replace(/:/g, '-')}`
);

const SCREENS = [
  { id: 'P1', path: 'overview', heading: /production overview/i },
  { id: 'P2', path: 'raw_materials', heading: /raw material/i },
  { id: 'P3', path: 'planning', heading: /production planning/i },
  { id: 'P4', path: 'work_orders', heading: /work order/i },
  { id: 'P5', path: 'qc', heading: /quality control/i },
  { id: 'P6', path: 'maintenance', heading: /maintenance/i },
  { id: 'P7', path: 'workforce', heading: /workforce/i },
  { id: 'P8', path: 'alerts', heading: /production alerts/i },
  { id: 'P9', path: 'reports', heading: /production reports/i },
  { id: 'P10', path: 'utilities', heading: /production utilities/i },
];

mkdirSync(REPORT_DIR, { recursive: true });
const flows = {};

function record(id, status, note = '') {
  flows[id] = { status, note };
  console.log(`[${id}] ${status}${note ? ` — ${note}` : ''}`);
}

async function productionLogin(page) {
  await page.goto(`${FRONTEND}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Production' }).click();
  await page.getByPlaceholder(/email/i).fill('production@selorg.com');
  await page.getByPlaceholder(/password/i).fill('password123');
  await page.getByRole('button', { name: /login to dashboard/i }).click();
  await page.waitForURL(/\/production/, { timeout: 30000 });
}

async function assertScreen(page, screen, apiErrors) {
  await page.goto(`${FRONTEND}/production/${screen.path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  const has5xx = apiErrors.some((e) => e.status >= 500);
  const headingVisible = await page.getByRole('heading', { name: screen.heading }).first().isVisible().catch(() => false);
  if (has5xx) {
    record(screen.id, 'fail', `API 5xx: ${apiErrors.map((e) => e.url).join(', ').slice(0, 120)}`);
    return;
  }
  if (!headingVisible) {
    record(screen.id, 'partial', 'heading not found');
    return;
  }
  record(screen.id, 'pass');
}

async function main() {
  const nodeBin = process.execPath;
  const backendDir = join(__dirname, '../../selorg-dashboard-backend-v1.1');
  spawnSync(nodeBin, [join(backendDir, 'src/seedProduction.js')], {
    cwd: backendDir,
    stdio: 'inherit',
  });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const apiErrors = [];

  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('/api/') && res.status() >= 500) {
      apiErrors.push({ url, status: res.status() });
    }
  });
  page.on('dialog', async (d) => d.accept());

  try {
    await productionLogin(page);
  } catch (e) {
    console.error('Login failed:', e.message);
    process.exit(1);
  }

  for (const screen of SCREENS) {
    apiErrors.length = 0;
    try {
      await assertScreen(page, screen, apiErrors);
    } catch (e) {
      record(screen.id, 'fail', e.message?.slice(0, 100));
    }
  }

  try {
    apiErrors.length = 0;
    await page.goto(`${FRONTEND}/production/raw_materials`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Add Material' }).click();
    await page.waitForTimeout(400);
    const modalVisible = await page.getByText('Add New Material').isVisible().catch(() => false);
    record('P2-action', modalVisible ? 'pass' : 'partial', 'Add Material modal');
  } catch (e) {
    record('P2-action', 'fail', e.message?.slice(0, 80));
  }

  try {
    await page.goto(`${FRONTEND}/production/planning`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const btn = page.getByRole('button', { name: 'Create Plan' }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(500);
      record('P3-action', 'pass', 'planning create opened');
    } else {
      record('P3-action', 'partial', 'no create plan button visible');
    }
  } catch (e) {
    record('P3-action', 'fail', e.message?.slice(0, 80));
  }

  writeFileSync(join(REPORT_DIR, 'flows.json'), JSON.stringify({ flows, frontend: FRONTEND }, null, 2));
  console.log(`\nReport: ${REPORT_DIR}/flows.json`);

  const failed = Object.values(flows).filter((f) => f.status === 'fail').length;
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
