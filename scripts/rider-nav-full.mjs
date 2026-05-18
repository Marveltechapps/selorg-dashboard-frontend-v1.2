#!/usr/bin/env node
/**
 * Rider nav verification — seed + all 13 visible screens + key button checks.
 * Usage: SMOKE_FRONTEND=http://127.0.0.1:5173 node scripts/rider-nav-full.mjs
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
  `../../Docs/test-reports/rider-nav-${new Date().toISOString().slice(0, 16).replace(/:/g, '-')}`
);

/** 13 visible sidebar items (communication hidden) */
const SCREENS = [
  { id: 'R1', path: 'overview', label: 'Rider Overview', match: /rider operations/i },
  { id: 'R2', path: 'hr', label: 'Rider HR & Docs', match: /rider hr|payroll/i },
  { id: 'R3', path: 'dispatch', label: 'Dispatch Operations', match: /dispatch operations/i },
  { id: 'R4', path: 'fleet', label: 'Fleet & Vehicle', match: /fleet.*vehicle/i },
  { id: 'R5', path: 'escalations', label: 'Escalations', match: /delivery escalation/i },
  { id: 'R6', path: 'alerts', label: 'Alerts & Exceptions', match: /alerts.*exceptions/i },
  { id: 'R7', path: 'analytics', label: 'Analytics & Reports', match: /analytics.*reports/i },
  { id: 'R8', path: 'rider-shifts', label: 'Rider Shifts', match: /rider shift management/i },
  { id: 'R9', path: 'shifts', label: 'Staff & Shifts', match: /staff.*shift/i },
  { id: 'R10', path: 'health', label: 'System Health', match: /system health/i },
  { id: 'R11', path: 'approvals', label: 'Task Approvals', match: /task approvals/i },
  { id: 'R12', path: 'training-kit', label: 'Training & Kit', match: /training.*kit/i },
  { id: 'R13', path: 'group-delivery', label: 'Group Delivery', match: /group delivery/i },
];

mkdirSync(REPORT_DIR, { recursive: true });
const flows = {};

function record(id, status, note = '') {
  flows[id] = { status, note };
  console.log(`[${id}] ${status}${note ? ` — ${note}` : ''}`);
}

async function riderLogin(page) {
  await page.goto(`${FRONTEND}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Rider Fleet' }).click();
  await page.getByPlaceholder(/email/i).fill('rider@selorg.com');
  await page.getByPlaceholder(/password/i).fill('password123');
  await page.getByRole('button', { name: /login to dashboard/i }).click();
  await page.waitForURL(/\/rider/, { timeout: 30000 });
}

async function assertScreen(page, screen, apiErrors) {
  await page.goto(`${FRONTEND}/rider/${screen.path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
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
  spawnSync(nodeBin, [join(backendDir, 'scripts/rider-seed-flows.js')], {
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
    await riderLogin(page);
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

  // R1 — Refresh on overview
  try {
    apiErrors.length = 0;
    await page.goto(`${FRONTEND}/rider/overview`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /refresh/i }).first().click();
    await page.waitForTimeout(800);
    record('R1-action', 'pass', 'overview refresh');
  } catch (e) {
    record('R1-action', 'fail', e.message?.slice(0, 80));
  }

  // R3 — seeded unassigned order visible on dispatch
  try {
    await page.goto(`${FRONTEND}/rider/dispatch`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const orderVisible = await page.getByText(/ORD-SMOKE-RIDER-/i).first().isVisible().catch(() => false);
    record('R3-action', orderVisible ? 'pass' : 'partial', 'seeded pending order');
  } catch (e) {
    record('R3-action', 'fail', e.message?.slice(0, 80));
  }

  // R4 — Add Vehicle modal
  try {
    await page.goto(`${FRONTEND}/rider/fleet`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /add vehicle/i }).click();
    await page.waitForTimeout(500);
    const modal = await page.getByRole('dialog').isVisible().catch(() => false);
    if (modal) await page.keyboard.press('Escape');
    record('R4-action', modal ? 'pass' : 'partial', 'add vehicle modal');
  } catch (e) {
    record('R4-action', 'fail', e.message?.slice(0, 80));
  }

  // R5 — seeded escalation or refresh
  try {
    await page.goto(`${FRONTEND}/rider/escalations`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const esc =
      (await page.getByText(/ORD-SMOKE-RIDER-/i).first().isVisible().catch(() => false)) ||
      (await page.getByText(/delivery failed/i).first().isVisible().catch(() => false));
    if (!esc) {
      await page.getByRole('button', { name: /refresh/i }).click();
      await page.waitForTimeout(800);
    }
    record('R5-action', esc ? 'pass' : 'partial', esc ? 'seeded escalation' : 'refresh clicked');
  } catch (e) {
    record('R5-action', 'fail', e.message?.slice(0, 80));
  }

  // R8 — New Shift modal
  try {
    await page.goto(`${FRONTEND}/rider/rider-shifts`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /new shift/i }).click();
    await page.waitForTimeout(500);
    const modal = await page.getByText(/create.*shift|shift details/i).first().isVisible().catch(() => false);
    if (modal) await page.keyboard.press('Escape');
    record('R8-action', modal ? 'pass' : 'partial', 'new shift modal');
  } catch (e) {
    record('R8-action', 'fail', e.message?.slice(0, 80));
  }

  // R9 — Create Shift modal (staff)
  try {
    await page.goto(`${FRONTEND}/rider/shifts`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /create shift/i }).click();
    await page.waitForTimeout(500);
    const modal = await page.getByRole('dialog').isVisible().catch(() => false);
    if (modal) await page.keyboard.press('Escape');
    record('R9-action', modal ? 'pass' : 'partial', 'create shift modal');
  } catch (e) {
    record('R9-action', 'fail', e.message?.slice(0, 80));
  }

  // R10 — Run diagnostics
  try {
    await page.goto(`${FRONTEND}/rider/health`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const diagBtn = page.getByRole('button', { name: /run diagnostics|diagnostics/i }).first();
    if (await diagBtn.isVisible().catch(() => false)) {
      await diagBtn.click();
      await page.waitForTimeout(2000);
      record('R10-action', 'pass', 'diagnostics run');
    } else {
      record('R10-action', 'partial', 'diagnostics button not found');
    }
  } catch (e) {
    record('R10-action', 'fail', e.message?.slice(0, 80));
  }

  // R12 — Add Video opens form section
  try {
    await page.goto(`${FRONTEND}/rider/training-kit`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /add video/i }).click();
    await page.waitForTimeout(400);
    const form =
      (await page.getByPlaceholder(/title|video url|url/i).first().isVisible().catch(() => false)) ||
      (await page.getByText(/save video|cancel/i).first().isVisible().catch(() => false));
    record('R12-action', form ? 'pass' : 'partial', 'add video form');
  } catch (e) {
    record('R12-action', 'fail', e.message?.slice(0, 80));
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
