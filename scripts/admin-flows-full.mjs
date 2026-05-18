#!/usr/bin/env node
/**
 * Admin 100% — browser user flows A1–A10 (operator-style)
 * Prereq: backend :3333, frontend, node scripts/admin-seed-flows.js in backend
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND = process.env.SMOKE_FRONTEND || 'http://127.0.0.1:5174';
const EMAIL = process.env.SUPERADMIN_EMAIL || 'superadmin@selorg.com';
const PASSWORD = process.env.SUPERADMIN_PASSWORD || 'SelorgDev1!SuperAdmin';
const REPORT_DIR = join(
  __dirname,
  `../../Docs/test-reports/admin-flows-full-${new Date().toISOString().slice(0, 16).replace(/:/g, '-')}`
);

mkdirSync(REPORT_DIR, { recursive: true });

const flows = {};

function record(id, status, note = '') {
  flows[id] = { status, note };
  console.log(`[${id}] ${status}${note ? ` — ${note}` : ''}`);
}

async function navSidebar(page, label) {
  const btn = page.getByRole('button', { name: label, exact: true });
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await page.waitForTimeout(800);
}

async function main() {
  const nodeBin = process.execPath;
  const seedScript = join(__dirname, '../../selorg-dashboard-backend-v1.1/scripts/admin-seed-flows.js');
  const backendDir = join(__dirname, '../../selorg-dashboard-backend-v1.1');
  const seed = spawnSync(nodeBin, [join(backendDir, 'scripts/admin-seed-flows.js')], {
    cwd: backendDir,
    encoding: 'utf8',
  });
  if (seed.status !== 0) {
    console.warn('Seed script warning:', seed.stderr || seed.stdout);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  let capturedDevOtp = '';

  page.on('response', async (res) => {
    if (res.url().includes('/verification/send-otp') && res.ok()) {
      try {
        const j = await res.json();
        if (j?.data?.devOtp) capturedDevOtp = j.data.devOtp;
      } catch {
        /* ignore */
      }
    }
  });

  page.on('dialog', async (dialog) => {
    if (dialog.type() === 'prompt') await dialog.accept('Smoke test rejection');
    else await dialog.accept();
  });

  const stamp = Date.now();

  try {
    // —— A1: Login & navigation ——
    await page.goto(`${FRONTEND}/login`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Admin Operations' }).click();
    await page.getByPlaceholder(/email/i).fill(EMAIL);
    await page.getByPlaceholder(/password/i).fill(PASSWORD);
    await page.getByRole('button', { name: /login to dashboard/i }).click();
    await page.waitForURL(/\/admin\/citywide/, { timeout: 20000 });
    await navSidebar(page, 'Users & Roles');
    await expectHeading(page, /user/i);
    await navSidebar(page, 'Master Data');
    await expectHeading(page, /master data/i);
    await navSidebar(page, 'Coupons');
    await expectHeading(page, /coupon|pricing/i);
    await page.locator('.admin-sidebar-nav').getByRole('button').last().click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
    record('A1', 'pass');
  } catch (e) {
    record('A1', 'fail', String(e.message).slice(0, 120));
  }

  // Re-login for remaining flows
  await page.goto(`${FRONTEND}/login`);
  await page.getByRole('button', { name: 'Admin Operations' }).click();
  await page.getByPlaceholder(/email/i).fill(EMAIL);
  await page.getByPlaceholder(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /login to dashboard/i }).click();
  await page.waitForURL(/\/admin/, { timeout: 20000 });

  const testEmail = `smoke-ui-${stamp}@selorg.local`;
  const testName = `Smoke UI ${stamp}`;
  const catName = `Smoke Cat ${stamp}`;
  const couponCode = `SMK${String(stamp).slice(-6)}`;

  try {
    // —— A2: Onboard operator ——
    await page.goto(`${FRONTEND}/admin/users`);
    await page.getByRole('button', { name: 'Add User' }).first().click();
    await page.getByLabel(/email/i).fill(testEmail);
    const otpField = page.locator('#otp');
    const [otpRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('send-otp') && r.ok(), { timeout: 15000 }),
      page.getByRole('button', { name: 'Send OTP' }).click(),
    ]);
    const otpJson = await otpRes.json();
    const devOtp = otpJson?.data?.devOtp || capturedDevOtp;
    if (devOtp) await otpField.fill(String(devOtp));
    const otpVal = await otpField.inputValue();
    if (!otpVal || otpVal.length < 4) {
      throw new Error('devOtp not available');
    }
    await page.getByRole('button', { name: 'Verify OTP' }).click();
    await page.getByText('Email verified').first().waitFor({ timeout: 10000 });
    await page.locator('#name').fill(testName);
    await page.locator('#department').click().catch(() => page.getByText('Select Department').click());
    await page.getByRole('option', { name: 'Operations' }).click();
    await page.locator('#role').click();
    await page.getByRole('option').filter({ hasNotText: /create a role|no roles/i }).first().click();
    await page.getByRole('button', { name: 'Create User' }).click();
    await page.waitForTimeout(2000);
    await page.locator('input[placeholder*="Search"]').first().fill(testEmail);
    await page.waitForTimeout(1000);
    await page.getByText(testEmail).first().waitFor({ state: 'visible', timeout: 10000 });
    await page.getByRole('button', { name: /more/i }).first().click().catch(() => {});
    const editItem = page.getByRole('menuitem', { name: /edit/i });
    if (await editItem.isVisible().catch(() => false)) {
      await editItem.click();
      await page.locator('input').filter({ has: page.locator('[id="name"]') }).first().fill(`${testName} Edited`);
      await page.getByRole('button', { name: /save|update/i }).click();
      await page.waitForTimeout(1500);
    }
    record('A2', 'pass');
  } catch (e) {
    record('A2', 'fail', String(e.message).slice(0, 120));
  }

  try {
    // —— A3: Master data warehouse ——
    await page.goto(`${FRONTEND}/admin/master-data`);
    await page.getByRole('button', { name: 'Add Warehouse' }).click();
    const whCode = `WH-SMK-${String(stamp).slice(-5)}`;
    const whDlg = page.getByRole('dialog');
    await whDlg.getByPlaceholder('WH-BLR-001').fill(whCode);
    await whDlg.locator('input').nth(1).fill(`Smoke WH ${stamp}`);
    await whDlg.locator('input').nth(2).fill('123 Smoke Street');
    await whDlg.getByRole('combobox').first().click();
    await page.getByRole('option').first().click();
    await whDlg.locator('input[type="number"]').nth(3).fill('12.9716');
    await whDlg.locator('input[type="number"]').nth(4).fill('77.5946');
    const [whRes] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/admin/warehouses') && r.request().method() === 'POST',
        { timeout: 20000 }
      ),
      whDlg.getByRole('button', { name: 'Create' }).scrollIntoViewIfNeeded().then(() =>
        whDlg.getByRole('button', { name: 'Create' }).click()
      ),
    ]);
    if (!whRes.ok()) {
      const errBody = await whRes.text().catch(() => '');
      throw new Error(`Warehouse API ${whRes.status()}: ${errBody.slice(0, 120)}`);
    }
    await page.getByText(/warehouse created/i).waitFor({ timeout: 8000 }).catch(() => {});
    record('A3', 'pass', whCode);
  } catch (e) {
    record('A3', 'fail', String(e.message).slice(0, 120));
  }

  try {
    // —— A4: Catalog category ——
    await page.goto(`${FRONTEND}/admin/catalog`);
    await page.getByRole('button', { name: 'Add Category' }).click();
    const catDlg = page.getByRole('dialog');
    await catDlg.locator('input').first().fill(catName);
    await page.getByRole('button', { name: 'Create Category' }).click();
    await page.waitForTimeout(2000);
    await page.getByText(catName).first().waitFor({ timeout: 15000 });
    await page.getByRole('button', { name: 'Edit' }).first().click();
    await page.getByRole('dialog').locator('input').first().fill(`${catName} Updated`);
    await page.getByRole('button', { name: 'Update Category' }).click();
    await page.waitForTimeout(1500);
    await page.getByText(`${catName} Updated`).first().waitFor({ timeout: 10000 });
    record('A4', 'pass');
  } catch (e) {
    record('A4', 'fail', String(e.message).slice(0, 120));
  }

  try {
    // —— A5: Approve OT ——
    await page.goto(`${FRONTEND}/admin/ot-approvals`);
    const approveBtn = page.getByRole('button', { name: 'Approve' }).first();
    await approveBtn.waitFor({ timeout: 10000 });
    await approveBtn.click();
    await page.waitForTimeout(1500);
    record('A5', 'pass');
  } catch (e) {
    record('A5', 'fail', String(e.message).slice(0, 120));
  }

  try {
    // —— A6: Reject OT ——
    await page.goto(`${FRONTEND}/admin/ot-approvals`);
    await page.getByRole('button', { name: 'Reject' }).first().click();
    await page.waitForTimeout(1500);
    record('A6', 'pass');
  } catch (e) {
    record('A6', 'fail', String(e.message).slice(0, 120));
  }

  try {
    // —— A7: Shift change approve ——
    await page.goto(`${FRONTEND}/admin/shift-change-approvals`);
    await page.getByRole('button', { name: 'Approve' }).first().click({ timeout: 10000 });
    await page.waitForTimeout(1500);
    record('A7', 'pass');
  } catch (e) {
    record('A7', 'fail', String(e.message).slice(0, 120));
  }

  try {
    // —— A8: Attendance export ——
    await page.goto(`${FRONTEND}/admin/attendance-export`);
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }),
      page.getByRole('button', { name: 'Export CSV' }).click(),
    ]);
    const path = await download.path();
    const suggested = download.suggestedFilename();
    if (!suggested?.includes('.csv') && !path) throw new Error('No CSV download');
    record('A8', 'pass', suggested || 'csv');
  } catch (e) {
    record('A8', 'fail', String(e.message).slice(0, 120));
  }

  try {
    // —— A9: Coupon in UI ——
    await page.goto(`${FRONTEND}/admin/pricing`);
    await page.getByRole('button', { name: 'Create Coupon' }).click();
    await page.locator('#coupon-code').fill(couponCode);
    await page.locator('#coupon-name').fill(`Smoke Coupon ${stamp}`);
    await page.getByRole('button', { name: 'Create Coupon' }).last().click();
    await page.waitForTimeout(2500);
    await page.getByText(couponCode, { timeout: 15000 }).waitFor();
    record('A9', 'pass');
  } catch (e) {
    record('A9', 'fail', String(e.message).slice(0, 120));
  }

  try {
    // —— A10: FAQ CMS ——
    await page.goto(`${FRONTEND}/admin/faq-management`);
    const faqQ = `Smoke FAQ Q ${stamp}?`;
    const faqA = `Smoke FAQ A ${stamp}`;
    await page.getByRole('button', { name: /new faq|add faq/i }).first().click();
    const faqDlg = page.getByRole('dialog');
    await faqDlg.getByPlaceholder(/how fast is delivery/i).fill(faqQ);
    await faqDlg.getByPlaceholder(/we deliver/i).fill(faqA);
    const [faqSave] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/faq') && r.request().method() === 'POST',
        { timeout: 20000 }
      ),
      faqDlg.getByRole('button', { name: 'Save' }).click(),
    ]);
    if (!faqSave.ok()) throw new Error(`FAQ API ${faqSave.status()}`);
    await page.waitForTimeout(1000);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText('FAQ Items').waitFor({ timeout: 15000 });
    const refresh = page.getByRole('button', { name: 'Refresh' });
    await refresh.waitFor({ state: 'visible' });
    await page.waitForTimeout(500);
    if (await refresh.isDisabled()) throw new Error('Refresh stuck disabled');
    await refresh.click();
    await page.waitForTimeout(1000);
    record('A10', 'pass');
  } catch (e) {
    record('A10', 'fail', String(e.message).slice(0, 120));
  }

  await browser.close();

  const allPass = Object.values(flows).every((f) => f.status === 'pass');
  const report = { flows, allPass, finishedAt: new Date().toISOString(), frontend: FRONTEND };
  writeFileSync(join(REPORT_DIR, 'flow-results.json'), JSON.stringify(report, null, 2));
  console.log('\nReport:', REPORT_DIR);
  console.log('All flows pass:', allPass);
  process.exit(allPass ? 0 : 1);
}

async function expectHeading(page, re) {
  await page.getByRole('heading', { name: re }).first().waitFor({ timeout: 12000 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
