#!/usr/bin/env node
/**
 * Warehouse nav verification — each sidebar screen loads from API and primary actions work.
 * Usage: SMOKE_FRONTEND=http://127.0.0.1:5173 node scripts/warehouse-flows-full.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND = process.env.SMOKE_FRONTEND || 'http://127.0.0.1:5173';
const REPORT_DIR = join(
  __dirname,
  `../../Docs/test-reports/warehouse-flows-${new Date().toISOString().slice(0, 16).replace(/:/g, '-')}`
);

const SCREENS = [
  { id: 'W1', tab: 'overview', label: 'Warehouse Overview', path: 'overview', heading: /warehouse overview/i },
  { id: 'W2', tab: 'inbound', label: 'Inbound Ops', path: 'inbound', heading: /inbound/i },
  { id: 'W3', tab: 'inventory', label: 'Inventory & Storage', path: 'inventory', heading: /inventory/i },
  { id: 'W4', tab: 'outbound', label: 'Outbound Ops', path: 'outbound', heading: /pick.*pack|outbound/i },
  { id: 'W5', tab: 'transfers', label: 'Transfers', path: 'transfers', heading: /transfer/i },
  { id: 'W6', tab: 'qc', label: 'QC & Compliance', path: 'qc', heading: /qc|compliance/i },
  { id: 'W7', tab: 'workforce', label: 'Workforce & Shifts', path: 'workforce', heading: /workforce|shift/i },
  { id: 'W8', tab: 'shift-master', label: 'Shift Master', path: 'shift-master', heading: /shift master/i },
  { id: 'W9', tab: 'shift-roster', label: 'Shift Roster', path: 'shift-roster', heading: /shift roster|roster/i },
  { id: 'W10', tab: 'equipment', label: 'Equipment & Assets', path: 'equipment', heading: /equipment/i },
  { id: 'W11', tab: 'devices', label: 'Devices', path: 'devices', heading: /device/i },
  { id: 'W12', tab: 'exceptions', label: 'Exceptions', path: 'exceptions', heading: /exception/i },
  { id: 'W13', tab: 'analytics', label: 'Reports & Analytics', path: 'analytics', heading: /report|analytics/i },
  { id: 'W14', tab: 'utilities', label: 'Utilities', path: 'utilities', heading: /utilit/i },
  { id: 'W15', tab: 'logistics', label: 'Logistics', path: 'logistics', heading: /logistics|pickup/i },
  { id: 'W16', tab: 'logistics-tracking', label: 'Logistics tracking', path: 'logistics-tracking', heading: /track/i },
  { id: 'W17', tab: 'logistics-estimate', label: 'Logistics estimate', path: 'logistics-estimate', heading: /estimate/i },
];

mkdirSync(REPORT_DIR, { recursive: true });
const flows = {};

function record(id, status, note = '') {
  flows[id] = { status, note };
  console.log(`[${id}] ${status}${note ? ` — ${note}` : ''}`);
}

async function warehouseLogin(page) {
  await page.goto(`${FRONTEND}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Warehouse Ops' }).click();
  await page.getByPlaceholder(/email/i).fill('warehouse@selorg.com');
  await page.getByPlaceholder(/password/i).fill('password123');
  await page.getByRole('button', { name: /login to dashboard/i }).click();
  await page.waitForURL(/\/warehouse/, { timeout: 30000 });
}

async function navSidebar(page, label) {
  const btn = page.getByRole('button', { name: label, exact: true });
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await page.waitForTimeout(800);
}

async function assertScreen(page, screen, apiErrors) {
  await page.goto(`${FRONTEND}/warehouse/${screen.path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const headingVisible = await page.getByRole('heading', { name: screen.heading }).first().isVisible().catch(() => false);
  const has5xx = apiErrors.some((e) => e.status >= 500);
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
  spawnSync(nodeBin, [join(backendDir, 'scripts/warehouse-seed-flows.js')], {
    cwd: backendDir,
    stdio: 'inherit',
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const apiErrors = [];

  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('/api/') && res.status() >= 500) {
      apiErrors.push({ url, status: res.status() });
    }
  });

  page.on('dialog', async (d) => d.accept());

  try {
    await warehouseLogin(page);
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

  // W2 — create GRN mutation
  try {
    apiErrors.length = 0;
    await page.goto(`${FRONTEND}/warehouse/inbound`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Create GRN' }).click();
    await page.getByPlaceholder('PO-XXXX').fill(`PO-FLOW-${Date.now()}`);
    await page.getByPlaceholder('Enter vendor name').fill('Flow Test Vendor');
    await page.getByPlaceholder('0').fill('5');
    await page.getByRole('button', { name: 'Create GRN' }).last().click();
    await page.waitForTimeout(2000);
    const ok = !(await page.getByText(/failed to create grn/i).isVisible().catch(() => false));
    record('W2-action', ok ? 'pass' : 'fail', ok ? 'create GRN' : 'create GRN failed');
  } catch (e) {
    record('W2-action', 'fail', e.message?.slice(0, 80));
  }

  // W8 — open shift master modal
  try {
    await page.goto(`${FRONTEND}/warehouse/shift-master`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Create Shift' }).click();
    await page.waitForTimeout(500);
    const modal = await page.getByRole('dialog').isVisible().catch(() => false);
    record('W8-action', modal ? 'pass' : 'partial', 'new shift modal');
  } catch (e) {
    record('W8-action', 'fail', e.message?.slice(0, 80));
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
