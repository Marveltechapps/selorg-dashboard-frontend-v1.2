#!/usr/bin/env node
/**
 * Phase B Darkstore smoke — screens §5.2 + flows D1-D9
 * Usage: node scripts/darkstore-smoke-phase-b.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND = process.env.SMOKE_FRONTEND || 'http://127.0.0.1:5174';
const BACKEND = process.env.SMOKE_BACKEND || 'http://localhost:3333';
const REPORT_DIR = join(__dirname, '../../Docs/test-reports/darkstore-phase-b-2026-05-16T12-00');
const screens = [
  'overview', 'liveorders', 'cancelledorders', 'pickpack', 'pickpackops', 'livepickingmonitor',
  'slamonitor', 'missingitems', 'exceptionqueue', 'livepickerboard', 'pickerperformance', 'issues',
  'inventory', 'inbound', 'outbound', 'qc', 'staff', 'health', 'escalations', 'alerts',
  'ops-alerts', 'reports', 'hsd', 'utilities', 'replenishment', 'replenishment-tracking',
];

mkdirSync(join(REPORT_DIR, 'screenshots'), { recursive: true });
mkdirSync(join(REPORT_DIR, 'video'), { recursive: true });

async function apiLogin() {
  const res = await fetch(`${BACKEND}/api/v1/darkstore/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'darkstore@selorg.com', password: 'password123' }),
  });
  const json = await res.json();
  if (!res.ok || !json?.data?.token) throw new Error(`Login failed: ${res.status} ${JSON.stringify(json).slice(0, 200)}`);
  return json.data;
}

async function main() {
  console.log('Starting darkstore smoke...');
  const auth = await apiLogin();
  console.log('Logged in as', auth.user?.email);
  const browser = await chromium.launch({ headless: true });
  console.log('Browser launched');
  const context = await browser.newContext();
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();

  const apiErrors = [];
  page.on('response', (res) => {
    const u = res.url();
    if ((u.includes('/api/') || u.includes('localhost:3333')) && res.status() >= 400) {
      apiErrors.push({ status: res.status(), url: u.slice(0, 150) });
    }
  });

  // Seed auth in sessionStorage before any app load
  await page.goto(`${FRONTEND}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ token, user, storeId }) => {
      sessionStorage.setItem('selorg_auth_token', token);
      sessionStorage.setItem('selorg_auth_user', JSON.stringify(user));
      if (storeId) sessionStorage.setItem('selorg_active_store_id', storeId);
    },
    {
      token: auth.token,
      user: auth.user,
      storeId: auth.user?.primaryStoreId || auth.user?.assignedStores?.[0],
    }
  );

  const screenResults = [];
  for (let i = 0; i < screens.length; i++) {
    const screen = screens[i];
    const errsBefore = apiErrors.length;
    let status = 'pass';
    let note = '';
    try {
      await page.goto(`${FRONTEND}/darkstore/${screen}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1200);
      const mainText = await page.locator('main').innerText().catch(() => '');
      const title = await page.title();
      const newErrs = apiErrors.slice(errsBefore);
      const has5xx = newErrs.some((e) => e.status >= 500);
      const hasAuth = newErrs.some((e) => e.status === 401 || e.status === 403);
      const hasBoundary = /something went wrong|error boundary|unexpected error/i.test(mainText);
      if (hasBoundary) {
        status = 'fail';
        note = 'error boundary';
      } else if (has5xx) {
        status = 'fail';
        note = `5xx: ${JSON.stringify(newErrs.filter((e) => e.status >= 500).slice(0, 2))}`;
      } else if (hasAuth) {
        status = 'fail';
        note = `auth: ${JSON.stringify(newErrs.slice(0, 2))}`;
      } else if (newErrs.length > 0) {
        status = 'partial';
        note = `4xx: ${JSON.stringify(newErrs.slice(0, 2))}`;
      }
      if (title.includes('Error')) {
        status = 'fail';
        note = (note ? note + '; ' : '') + `title=${title}`;
      }
      await page.screenshot({
        path: join(REPORT_DIR, 'screenshots', `screen-${String(i + 1).padStart(2, '0')}-${screen}.png`),
        fullPage: false,
      });
    } catch (e) {
      status = 'fail';
      note = String(e.message).slice(0, 120);
    }
    screenResults.push({ screen, status, note });
  }

  const flowResults = [];

  if (process.env.DARKSTORE_SCREENS_ONLY === '1') {
    const tracePath = join(REPORT_DIR, 'video/trace.zip');
    await context.tracing.stop({ path: tracePath });
    await browser.close();
    const out = { screenResults, flowResults: [], apiErrorSample: apiErrors.slice(0, 20) };
    writeFileSync(join(REPORT_DIR, 'smoke-results.json'), JSON.stringify(out, null, 2));
    const pass = screenResults.filter((r) => r.status === 'pass').length;
    const fail = screenResults.filter((r) => r.status === 'fail').length;
    console.log(`Screens: ${pass}/${screens.length} pass, ${fail} fail`);
    process.exit(fail > 0 ? 1 : 0);
  }

  // D1: login + overview + liveorders nav
  try {
    await page.goto(`${FRONTEND}/darkstore/overview`, { waitUntil: 'domcontentloaded' });
    const storeCtx = await page.getByText(/DS-|Your Store/i).first().isVisible().catch(() => false);
    await page.getByRole('button', { name: 'Live Orders' }).click();
    await page.waitForURL(/liveorders/, { timeout: 10000 });
    flowResults.push({ flow: 'D1', status: storeCtx ? 'pass' : 'partial', note: storeCtx ? '' : 'store context not visible' });
  } catch (e) {
    flowResults.push({ flow: 'D1', status: 'fail', note: e.message.slice(0, 100) });
  }

  // D2: live orders - need data
  try {
    await page.goto(`${FRONTEND}/darkstore/liveorders`, { waitUntil: 'domcontentloaded' });
    const rows = await page.locator('table tbody tr, [data-order-id], [role="row"]').count();
    if (rows === 0) {
      const empty = await page.getByText(/no orders|no live orders|empty/i).first().isVisible().catch(() => true);
      flowResults.push({ flow: 'D2', status: 'blocked', note: empty ? 'no seed orders' : 'no actionable rows' });
    } else {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.click();
      await page.waitForTimeout(800);
      flowResults.push({ flow: 'D2', status: 'partial', note: 'order opened; full action not automated' });
    }
  } catch (e) {
    flowResults.push({ flow: 'D2', status: 'fail', note: e.message.slice(0, 100) });
  }

  // D3 pickpack
  try {
    await page.goto(`${FRONTEND}/darkstore/pickpack`, { waitUntil: 'domcontentloaded' });
    const tasks = await page.locator('table tbody tr, [data-task]').count();
    flowResults.push({
      flow: 'D3',
      status: tasks > 0 ? 'partial' : 'blocked',
      note: tasks > 0 ? 'tasks visible; pick steps not run' : 'no pick tasks seeded',
    });
  } catch (e) {
    flowResults.push({ flow: 'D3', status: 'fail', note: e.message.slice(0, 100) });
  }

  // D4 exception queue
  try {
    await page.goto(`${FRONTEND}/darkstore/exceptionqueue`, { waitUntil: 'domcontentloaded' });
    const items = await page.locator('table tbody tr').count();
    flowResults.push({
      flow: 'D4',
      status: items > 0 ? 'partial' : 'blocked',
      note: items > 0 ? 'exceptions listed' : 'empty queue',
    });
  } catch (e) {
    flowResults.push({ flow: 'D4', status: 'fail', note: e.message.slice(0, 100) });
  }

  // D5 inventory adjustment
  try {
    await page.goto(`${FRONTEND}/darkstore/inventory`, { waitUntil: 'domcontentloaded' });
    const skus = await page.locator('table tbody tr').count();
    flowResults.push({
      flow: 'D5',
      status: skus > 0 ? 'partial' : 'blocked',
      note: skus > 0 ? 'inventory rows; adjust not run' : 'no inventory rows',
    });
  } catch (e) {
    flowResults.push({ flow: 'D5', status: 'fail', note: e.message.slice(0, 100) });
  }

  // D6 inbound
  try {
    await page.goto(`${FRONTEND}/darkstore/inbound`, { waitUntil: 'domcontentloaded' });
    const lines = await page.locator('table tbody tr').count();
    flowResults.push({
      flow: 'D6',
      status: lines > 0 ? 'partial' : 'blocked',
      note: lines > 0 ? 'inbound lines present' : 'no inbound seed',
    });
  } catch (e) {
    flowResults.push({ flow: 'D6', status: 'fail', note: e.message.slice(0, 100) });
  }

  // D7 outbound
  try {
    await page.goto(`${FRONTEND}/darkstore/outbound`, { waitUntil: 'domcontentloaded' });
    const lines = await page.locator('table tbody tr').count();
    flowResults.push({
      flow: 'D7',
      status: lines > 0 ? 'partial' : 'blocked',
      note: lines > 0 ? 'outbound rows present' : 'no outbound seed',
    });
  } catch (e) {
    flowResults.push({ flow: 'D7', status: 'fail', note: e.message.slice(0, 100) });
  }

  // D8 staff
  try {
    await page.goto(`${FRONTEND}/darkstore/staff`, { waitUntil: 'domcontentloaded' });
    const roster = await page.locator('table tbody tr, [data-shift]').count();
    flowResults.push({
      flow: 'D8',
      status: roster > 0 ? 'partial' : 'blocked',
      note: roster > 0 ? 'roster visible' : 'no staff/shift seed',
    });
  } catch (e) {
    flowResults.push({ flow: 'D8', status: 'fail', note: e.message.slice(0, 100) });
  }

  // D9 sla or missing items
  try {
    await page.goto(`${FRONTEND}/darkstore/slamonitor`, { waitUntil: 'domcontentloaded' });
    let items = await page.locator('table tbody tr').count();
    if (items === 0) {
      await page.goto(`${FRONTEND}/darkstore/missingitems`, { waitUntil: 'domcontentloaded' });
      items = await page.locator('table tbody tr').count();
    }
    flowResults.push({
      flow: 'D9',
      status: items > 0 ? 'partial' : 'blocked',
      note: items > 0 ? 'SLA/missing items listed' : 'no SLA/missing seed',
    });
  } catch (e) {
    flowResults.push({ flow: 'D9', status: 'fail', note: e.message.slice(0, 100) });
  }

  const tracePath = join(REPORT_DIR, 'video/trace.zip');
  await context.tracing.stop({ path: tracePath });
  await browser.close();

  const out = { screenResults, flowResults, apiErrorSample: apiErrors.slice(0, 20) };
  writeFileSync(join(REPORT_DIR, 'smoke-results.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
