#!/usr/bin/env node
/**
 * Smoke-test all dashboard screens — ensures no error boundary or hub-guard blocks.
 * Usage: SMOKE_FRONTEND=http://127.0.0.1:5173 node scripts/dashboard-screens-smoke.mjs
 */
import { chromium } from 'playwright';

const FRONTEND = process.env.SMOKE_FRONTEND || 'http://127.0.0.1:5173';
const API = process.env.SMOKE_API || 'http://127.0.0.1:3333/api/v1';

const CRASH_PATTERNS = [
  /something went wrong/i,
  /is not defined/i,
  /please refresh/i,
  /unexpected error/i,
];

const HUB_BLOCK_PATTERNS = [
  /select a delivery hub/i,
  /select a store/i,
  /select a fulfillment hub/i,
  /select a merchandising hub/i,
  /select an operational hub/i,
];

const DASHBOARDS = [
  {
    id: 'rider',
    roleButton: 'Rider Fleet',
    email: 'rider@selorg.com',
    password: 'password123',
    screens: [
      'overview', 'dispatch', 'escalations', 'alerts', 'fleet', 'group-delivery', 'rider-cash',
      'hr', 'rider-shifts', 'training-kit', 'approvals', 'live-chat-support', 'health', 'analytics',
    ],
  },
  {
    id: 'warehouse',
    roleButton: 'Warehouse Ops',
    email: 'warehouse@selorg.com',
    password: 'password123',
    screens: [
      'overview', 'exceptions', 'analytics', 'inbound', 'inventory', 'qc', 'outbound', 'transfers',
      'workforce', 'shift-master', 'shift-roster', 'equipment', 'devices', 'navigation', 'utilities', 'logistics',
    ],
  },
  {
    id: 'merch',
    roleButton: 'Merch & Promo',
    email: 'merch@selorg.com',
    password: 'password123',
    screens: [
      'overview', 'catalog', 'pricing', 'promotions', 'allocation', 'geofence', 'analytics', 'alerts', 'compliance',
    ],
  },
  {
    id: 'finance',
    roleButton: 'Finance',
    email: 'finance@selorg.com',
    password: 'password123',
    screens: [
      'overview', 'alerts', 'approvals', 'customer-payments', 'refunds', 'picker-payouts', 'rider-cash',
      'vendor-payments', 'billing', 'reconciliation', 'ledger', 'analytics', 'utilities',
    ],
  },
  {
    id: 'darkstore',
    roleButton: 'Darkstore Ops',
    email: 'darkstore@selorg.com',
    password: 'password123',
    screens: [
      'overview', 'my-shift', 'liveorders', 'exception-inbox', 'slamonitor', 'fulfillment', 'livepickerboard',
      'pickerperformance', 'missingitems', 'issues', 'inventory', 'inbound', 'outbound', 'replenishment',
      'staff', 'qc', 'health', 'reports', 'ops-analytics', 'hsd', 'regional', 'store-settings',
    ],
  },
  {
    id: 'vendor',
    roleButton: 'Vendor & Supplier',
    email: 'vendor@selorg.com',
    password: 'password123',
    screens: [
      'overview', 'alerts', 'approvals', 'vendor-list', 'po', 'inbound', 'inventory', 'qc', 'analytics', 'finance', 'utilities',
    ],
    hiddenRole: true,
  },
  {
    id: 'production',
    roleButton: 'Production',
    email: 'production@selorg.com',
    password: 'password123',
    screens: [
      'overview', 'alerts', 'raw_materials', 'planning', 'work_orders', 'qc', 'maintenance', 'workforce', 'reports', 'utilities',
    ],
    hiddenRole: true,
  },
  {
    id: 'admin',
    roleButton: 'Admin Operations',
    email: 'admin@selorg.com',
    password: 'password123',
    screens: [
      'citywide', 'master-data', 'users', 'customers', 'catalog', 'pricing', 'legal-policies', 'legal-documents',
      'picker-management', 'agencies', 'ot-approvals', 'shift-change-approvals', 'attendance-export',
      'support', 'fraud', 'analytics', 'notifications', 'geofence', 'compliance', 'content-hub',
      'content-hub-categories', 'home-config', 'products-introduction', 'collections', 'audit', 'system-tools',
      'applications', 'customer-app-home', 'onboarding', 'app-settings', 'app-cms', 'cms-pages', 'faq-management',
      'logistics-providers', 'platform-config',
    ],
    hiddenRole: true,
  },
];

async function apiLogin(page, dash) {
  const res = await fetch(`${API}/${dash.id}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: dash.email, password: dash.password, role: dash.id }),
  });
  const json = await res.json();
  const token = json?.data?.token;
  const user = json?.data?.user;
  if (!token || !user) throw new Error(json?.error?.message || 'API login failed');

  const payload = JSON.parse(
    Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
  );
  const hubKey = payload.hubKey || user.hubKey || '';
  const store =
    (user.primaryStoreId && String(user.primaryStoreId).trim()) ||
    user.assignedStores?.find((s) => s && String(s).trim()) ||
    hubKey ||
    null;

  await page.goto(`${FRONTEND}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ token, user, store, hubKey }) => {
      const authUser = {
        id: String(user._id || user.id || ''),
        email: user.email,
        name: user.name,
        role: user.role,
        ...(user.assignedStores?.length ? { assignedStores: user.assignedStores } : {}),
        ...(user.primaryStoreId && String(user.primaryStoreId).trim()
          ? { primaryStoreId: String(user.primaryStoreId).trim() }
          : {}),
        ...(hubKey ? { hubKey } : {}),
      };
      sessionStorage.setItem('selorg_auth_token', token);
      sessionStorage.setItem('selorg_auth_user', JSON.stringify(authUser));
      if (store) sessionStorage.setItem('selorg_active_store', store);
    },
    { token, user, store, hubKey }
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.goto(`${FRONTEND}/${dash.id}/overview`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  if (page.url().includes('/login')) throw new Error('session not accepted');
}

async function login(page, dash) {
  if (dash.hiddenRole) {
    await apiLogin(page, dash);
    return;
  }
  await page.goto(`${FRONTEND}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: dash.roleButton }).click();
  await page.getByPlaceholder(/email/i).fill(dash.email);
  await page.getByPlaceholder(/password/i).fill(dash.password);
  await page.getByRole('button', { name: /login to dashboard/i }).click();
  await page.waitForURL(new RegExp(`/${dash.id}`), { timeout: 30000 });
}

async function checkScreen(page, dash, screen) {
  await page.goto(`${FRONTEND}/${dash.id}/${screen}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const body = await page.locator('body').innerText().catch(() => '');
  const crashed = CRASH_PATTERNS.some((p) => p.test(body));
  const hubBlocked = HUB_BLOCK_PATTERNS.some((p) => p.test(body));
  if (crashed) return { status: 'fail', note: 'error boundary / crash' };
  if (hubBlocked) return { status: 'fail', note: 'hub/store guard blocking content' };
  return { status: 'pass' };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const results = [];
  let failures = 0;

  for (const dash of DASHBOARDS) {
    try {
      await login(page, dash);
    } catch (e) {
      for (const screen of dash.screens) {
        results.push({ dash: dash.id, screen, status: 'fail', note: `login failed: ${e.message}` });
        failures++;
      }
      continue;
    }

    for (const screen of dash.screens) {
      const r = await checkScreen(page, dash, screen);
      results.push({ dash: dash.id, screen, ...r });
      const tag = r.status === 'pass' ? 'PASS' : 'FAIL';
      console.log(`[${tag}] ${dash.id}/${screen}${r.note ? ` — ${r.note}` : ''}`);
      if (r.status !== 'pass') failures++;
    }

    await page.goto(`${FRONTEND}/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      sessionStorage.clear();
    });
  }

  await browser.close();
  console.log(`\nDone: ${results.length - failures}/${results.length} passed`);
  if (failures > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
