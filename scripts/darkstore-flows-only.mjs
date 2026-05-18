#!/usr/bin/env node
import { chromium } from 'playwright';

const FRONTEND = 'http://localhost:5173';
const BACKEND = 'http://localhost:3333';

async function apiLogin() {
  const res = await fetch(`${BACKEND}/api/v1/darkstore/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'darkstore@selorg.com', password: 'password123' }),
  });
  const json = await res.json();
  return json.data;
}

async function main() {
  const auth = await apiLogin();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${FRONTEND}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ token, user, storeId }) => {
      sessionStorage.setItem('selorg_auth_token', token);
      sessionStorage.setItem('selorg_auth_user', JSON.stringify(user));
      if (storeId) sessionStorage.setItem('selorg_active_store_id', storeId);
    },
    { token: auth.token, user: auth.user, storeId: auth.user?.primaryStoreId }
  );

  const flowResults = [];

  try {
    await page.goto(`${FRONTEND}/darkstore/overview`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);
    const storeCtx = await page.getByText(/DS-Adyar|Your Store/i).first().isVisible().catch(() => false);
    await page.getByRole('button', { name: 'Live Orders' }).click();
    await page.waitForURL(/liveorders/, { timeout: 10000 });
    flowResults.push({ flow: 'D1', status: 'pass', note: storeCtx ? '' : 'store label not found' });
  } catch (e) {
    flowResults.push({ flow: 'D1', status: 'fail', note: e.message.slice(0, 120) });
  }

  try {
    await page.goto(`${FRONTEND}/darkstore/liveorders`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);
    const rows = await page.locator('table tbody tr').count();
    if (rows === 0) flowResults.push({ flow: 'D2', status: 'blocked', note: 'no orders in table' });
    else {
      await page.locator('table tbody tr').first().click();
      await page.waitForTimeout(800);
      flowResults.push({ flow: 'D2', status: 'partial', note: `opened order row (${rows} rows)` });
    }
  } catch (e) {
    flowResults.push({ flow: 'D2', status: 'fail', note: e.message.slice(0, 120) });
  }

  for (const [flow, path, selector] of [
    ['D3', 'pickpack', 'table tbody tr'],
    ['D4', 'exceptionqueue', 'table tbody tr'],
    ['D5', 'inventory', 'table tbody tr'],
    ['D6', 'inbound', 'table tbody tr'],
    ['D7', 'outbound', 'table tbody tr'],
    ['D8', 'staff', 'table tbody tr, [data-shift]'],
    ['D9', 'slamonitor', 'table tbody tr'],
  ]) {
    try {
      await page.goto(`${FRONTEND}/darkstore/${path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1200);
      let count = await page.locator(selector).count();
      if (flow === 'D9' && count === 0) {
        await page.goto(`${FRONTEND}/darkstore/missingitems`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(800);
        count = await page.locator('table tbody tr').count();
      }
      flowResults.push({
        flow,
        status: count > 0 ? 'partial' : 'blocked',
        note: count > 0 ? `${count} rows visible` : 'no seed data',
      });
    } catch (e) {
      flowResults.push({ flow, status: 'fail', note: e.message.slice(0, 120) });
    }
  }

  await browser.close();
  console.log(JSON.stringify(flowResults, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
