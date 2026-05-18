#!/usr/bin/env node
/**
 * Darkstore nav verification — seed + all 26 screens + key button checks.
 * Usage: SMOKE_FRONTEND=http://127.0.0.1:5173 node scripts/darkstore-nav-full.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND = process.env.SMOKE_FRONTEND || 'http://127.0.0.1:5173';
const STORE_ID = 'DS-Adyar-01';
const REPORT_DIR = join(
  __dirname,
  `../../Docs/test-reports/darkstore-nav-${new Date().toISOString().slice(0, 16).replace(/:/g, '-')}`
);

const SCREENS = [
  { id: 'DS1', path: 'overview', label: 'Store Overview', match: /store overview/i },
  { id: 'DS2', path: 'liveorders', label: 'Live Orders', match: /live order/i },
  { id: 'DS3', path: 'cancelledorders', label: 'Cancelled Orders', match: /cancelled/i },
  { id: 'DS4', path: 'pickpack', label: 'Pick Tasks & Pack', match: /pick|pack/i },
  { id: 'DS5', path: 'pickpackops', label: 'Pick & Pack Ops', match: /pick.*pack|picklist/i },
  { id: 'DS6', path: 'livepickingmonitor', label: 'Live Picking Monitor', match: /live picking monitor/i },
  { id: 'DS7', path: 'slamonitor', label: 'SLA Monitor', match: /sla monitor/i },
  { id: 'DS8', path: 'missingitems', label: 'Missing Item Tracker', match: /missing item/i },
  { id: 'DS9', path: 'exceptionqueue', label: 'Exception Queue', match: /exception queue/i },
  { id: 'DS10', path: 'livepickerboard', label: 'Live Picker Board', match: /picker board|live picker/i },
  { id: 'DS11', path: 'pickerperformance', label: 'Picker Performance', match: /picker performance/i },
  { id: 'DS12', path: 'issues', label: 'Issue Management', match: /issue management/i },
  { id: 'DS13', path: 'inventory', label: 'Inventory Mgmt', match: /inventory/i },
  { id: 'DS14', path: 'inbound', label: 'Inbound Ops', match: /inbound|grn|putaway/i },
  { id: 'DS15', path: 'outbound', label: 'Outbound Ops', match: /outbound|dispatch/i },
  { id: 'DS16', path: 'qc', label: 'QC & Compliance', match: /quality|compliance|qc/i },
  { id: 'DS17', path: 'staff', label: 'Staff & Shifts', match: /staff|shift/i },
  { id: 'DS18', path: 'health', label: 'Store Health', match: /store health|health/i },
  { id: 'DS19', path: 'escalations', label: 'Escalations', match: /escalation/i },
  { id: 'DS20', path: 'alerts', label: 'Alerts', match: /alert/i },
  { id: 'DS21', path: 'ops-alerts', label: 'Operations Alerts', match: /operations alert/i },
  { id: 'DS22', path: 'reports', label: 'Reports', match: /report|analytics/i },
  { id: 'DS23', path: 'hsd', label: 'HSD Devices', match: /hsd|device|fleet/i },
  { id: 'DS24', path: 'utilities', label: 'Utilities', match: /utilit/i },
  { id: 'DS25', path: 'replenishment', label: 'Replenishment', match: /logistics|replenish/i },
  { id: 'DS26', path: 'replenishment-tracking', label: 'Replenishment tracking', match: /track/i },
];

mkdirSync(REPORT_DIR, { recursive: true });
const flows = {};

function record(id, status, note = '') {
  flows[id] = { status, note };
  console.log(`[${id}] ${status}${note ? ` — ${note}` : ''}`);
}

async function darkstoreLogin(page) {
  await page.goto(`${FRONTEND}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Darkstore Ops' }).click();
  await page.getByPlaceholder(/email/i).fill('darkstore@selorg.com');
  await page.getByPlaceholder(/password/i).fill('password123');
  await page.getByRole('button', { name: /login to dashboard/i }).click();
  await page.waitForURL(/\/darkstore/, { timeout: 30000 });
  await page.evaluate((storeId) => {
    sessionStorage.setItem('selorg_active_store_id', storeId);
  }, STORE_ID);
}

async function assertScreen(page, screen, apiErrors) {
  await page.goto(`${FRONTEND}/darkstore/${screen.path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  const mainText = await page.locator('main').innerText().catch(() => '');
  const hasBoundary = /something went wrong|error boundary|unexpected error/i.test(mainText);
  const has5xx = apiErrors.some((e) => e.status >= 500);
  const headingVisible = await page.getByRole('heading', { name: screen.match }).first().isVisible().catch(() => false);
  const textVisible = screen.match.test(mainText);
  if (hasBoundary || has5xx) {
    record(screen.id, 'fail', hasBoundary ? 'error boundary' : `5xx: ${apiErrors.map((e) => e.status).join(',')}`);
    return;
  }
  if (!headingVisible && !textVisible) {
    record(screen.id, 'partial', 'title not found');
    return;
  }
  record(screen.id, 'pass');
}

async function main() {
  const nodeBin = process.execPath;
  const backendDir = join(__dirname, '../../selorg-dashboard-backend-v1.1');
  spawnSync(nodeBin, [join(backendDir, 'scripts/darkstore-seed-flows.js')], {
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
    await darkstoreLogin(page);
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

  // Key actions
  try {
    apiErrors.length = 0;
    await page.goto(`${FRONTEND}/darkstore/inventory`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /adjustments/i }).click();
    await page.waitForTimeout(400);
    const adj = await page.getByText(/adjustment|scan or type sku/i).first().isVisible().catch(() => false);
    record('DS13-action', adj ? 'pass' : 'partial', 'adjustments panel');
  } catch (e) {
    record('DS13-action', 'fail', e.message?.slice(0, 80));
  }

  try {
    await page.goto(`${FRONTEND}/darkstore/utilities`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.waitForTimeout(500);
    const modal = await page.getByRole('dialog').isVisible().catch(() => false);
    record('DS24-action', modal ? 'pass' : 'partial', 'settings modal');
  } catch (e) {
    record('DS24-action', 'fail', e.message?.slice(0, 80));
  }

  try {
    await page.goto(`${FRONTEND}/darkstore/inbound`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const grn = await page.getByText(/GRN-SMOKE-/i).first().isVisible().catch(() => false);
    record('DS14-action', grn ? 'pass' : 'partial', 'seeded GRN visible');
  } catch (e) {
    record('DS14-action', 'fail', e.message?.slice(0, 80));
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
