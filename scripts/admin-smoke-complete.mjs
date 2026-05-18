#!/usr/bin/env node
/**
 * Phase A Admin smoke — all §5.1 screens + flow API checks
 * Usage: SMOKE_FRONTEND=http://localhost:5174 node scripts/admin-smoke-complete.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND = process.env.SMOKE_FRONTEND || 'http://localhost:5173';
const BACKEND = process.env.SMOKE_BACKEND || 'http://localhost:3333';
const REPORT_DIR = join(
  __dirname,
  `../../Docs/test-reports/admin-complete-${new Date().toISOString().slice(0, 16).replace(/:/g, '-')}`
);

const screens = [
  'citywide',
  'picker-management',
  'agencies',
  'ot-approvals',
  'shift-change-approvals',
  'attendance-export',
  'master-data',
  'users',
  'customers',
  'catalog',
  'pricing',
  'legal-policies',
  'logistics-providers',
  'support',
  'fraud',
  'analytics',
  'notifications',
  'geofence',
  'compliance',
  'content-hub',
  'audit',
  'platform-config',
  'system-tools',
  'applications',
  'customer-app-home',
  'onboarding',
  'app-settings',
  'app-cms',
  'cms-pages',
  'faq-management',
  'home-config',
  'products-introduction',
  'content-hub-categories',
  'collections',
];

mkdirSync(join(REPORT_DIR, 'screenshots'), { recursive: true });

async function adminLogin() {
  const res = await fetch(`${BACKEND}/api/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.SUPERADMIN_EMAIL || 'superadmin@selorg.com',
      password: process.env.SUPERADMIN_PASSWORD || 'SelorgDev1!SuperAdmin',
    }),
  });
  const json = await res.json();
  if (!res.ok || !json?.data?.token) {
    throw new Error(`Admin login failed: ${res.status} ${JSON.stringify(json).slice(0, 200)}`);
  }
  return json.data;
}

async function runFlowApiChecks(token) {
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const flows = {};

  const cat = await fetch(`${BACKEND}/api/v1/merch/pricing/references/categories`, { headers: h });
  flows.A9_categories = cat.ok ? 'pass' : `fail:${cat.status}`;

  const email = `smoke-a2-${Date.now()}@selorg.local`;
  const otpRes = await fetch(`${BACKEND}/api/v1/admin/users/verification/send-otp`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ email }),
  });
  const otpJ = await otpRes.json();
  if (otpRes.ok && otpJ.data?.devOtp) {
    const verify = await fetch(`${BACKEND}/api/v1/admin/users/verification/verify-otp`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({
        email,
        otp: otpJ.data.devOtp,
        verificationRequestId: otpJ.data.verificationRequestId,
      }),
    });
    const vj = await verify.json();
    const create = await fetch(`${BACKEND}/api/v1/admin/users`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({
        email,
        password: 'SmokeTest1!',
        name: 'Smoke Operator',
        department: 'admin',
        emailVerifiedToken: vj.data?.emailVerifiedToken,
      }),
    });
    flows.A2_onboard = create.ok ? 'pass' : `fail:${create.status}`;
  } else {
    flows.A2_onboard = `fail:otp:${otpRes.status}`;
  }

  const code = `SMOKE${Date.now().toString().slice(-6)}`;
  const coupon = await fetch(`${BACKEND}/api/v1/merch/pricing/coupons`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      code,
      name: 'Smoke Coupon',
      discountType: 'percentage',
      discountValue: 10,
      status: 'active',
      minOrderValue: 100,
    }),
  });
  flows.A9_coupon = coupon.ok ? 'pass' : `fail:${coupon.status}`;

  const shifts = await fetch(`${BACKEND}/api/v1/admin/picker/shift-change-requests`, { headers: h });
  const sj = await shifts.json();
  const req = sj.data?.[0];
  if (req?.requestId) {
    const dec = await fetch(
      `${BACKEND}/api/v1/admin/picker/shift-change-requests/${req.requestId}/decision`,
      { method: 'POST', headers: h, body: JSON.stringify({ decision: 'approve' }) }
    );
    flows.A7_shift = dec.ok ? 'pass' : `fail:${dec.status}`;
  } else {
    flows.A7_shift = 'skip:no_pending';
  }

  return flows;
}

async function main() {
  console.log('Admin smoke — frontend', FRONTEND);
  const auth = await adminLogin();
  const flowResults = await runFlowApiChecks(auth.token);
  console.log('API flows:', flowResults);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const apiErrors = [];
  page.on('response', (res) => {
    const u = res.url();
    if ((u.includes('/api/') || u.includes('localhost:3333')) && res.status() >= 400) {
      apiErrors.push({ status: res.status(), url: u.slice(0, 180) });
    }
  });

  await page.goto(`${FRONTEND}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ token, user }) => {
      sessionStorage.setItem('selorg_auth_token', token);
      sessionStorage.setItem('selorg_auth_user', JSON.stringify(user));
    },
    { token: auth.token, user: auth.user }
  );

  const screenResults = [];
  for (const screen of screens) {
    const errsBefore = apiErrors.length;
    let status = 'pass';
    let note = '';
    try {
      await page.goto(`${FRONTEND}/admin/${screen}`, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });
      await page.waitForTimeout(1000);
      const bodyText = await page.locator('body').innerText().catch(() => '');
      if (/something went wrong|error boundary|failed to load/i.test(bodyText)) {
        status = 'fail';
        note = 'error boundary or load failure text';
      }
      const newErrs = apiErrors.slice(errsBefore).filter((e) => e.status >= 500);
      if (newErrs.length) {
        status = 'fail';
        note = newErrs.map((e) => `${e.status} ${e.url}`).join('; ').slice(0, 200);
      }
      await page.screenshot({
        path: join(REPORT_DIR, 'screenshots', `${screen}.png`),
        fullPage: false,
      });
    } catch (err) {
      status = 'fail';
      note = String(err.message || err).slice(0, 120);
    }
    screenResults.push({ screen, status, note });
    console.log(screen, status, note);
  }

  await browser.close();

  const p0Fails = screenResults.filter((r) => r.status === 'fail');
  const report = {
    dashboard: 'admin',
    finishedAt: new Date().toISOString(),
    frontend: FRONTEND,
    backend: BACKEND,
    screensTotal: screens.length,
    screensPass: screenResults.filter((r) => r.status === 'pass').length,
    screensFail: p0Fails.length,
    screenResults,
    flowResults,
    signOff: p0Fails.length === 0 && !Object.values(flowResults).some((v) => v.startsWith('fail')),
  };

  writeFileSync(join(REPORT_DIR, 'smoke-results.json'), JSON.stringify(report, null, 2));
  writeFileSync(
    join(REPORT_DIR, 'report.md'),
    `# Admin smoke — ${report.finishedAt}\n\n- Screens: ${report.screensPass}/${report.screensTotal} pass\n- Sign-off: ${report.signOff ? 'YES' : 'NO'}\n\n## Flows\n${Object.entries(flowResults).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n\n## Failed screens\n${p0Fails.map((r) => `- ${r.screen}: ${r.note}`).join('\n') || 'None'}\n`
  );
  console.log('Report:', REPORT_DIR);
  console.log('Sign-off:', report.signOff);
  process.exit(report.signOff ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
