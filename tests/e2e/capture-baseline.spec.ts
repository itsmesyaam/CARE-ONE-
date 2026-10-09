import { test } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test('capture baseline visual screenshots', async ({ page }) => {
  const mode = process.env.SCREENSHOT_MODE || 'before';
  const dir = path.resolve(process.cwd(), 'docs/review/screenshots');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // 1. Patient Home
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(dir, `${mode}-patient-home.png`) });

  // 2. Patient Sign In
  await page.goto('/patient/signin', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(dir, `${mode}-patient-signin.png`) });

  // 3. Staff Sign In
  await page.goto('/staff/signin', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(dir, `${mode}-staff-signin.png`) });

  // 4. Doctor Sign In & Chart
  await page.waitForTimeout(1600);
  const signInBtn = page.locator('button[type="submit"]');
  if (await signInBtn.isVisible()) {
    await signInBtn.click();
    await page.waitForTimeout(1000);
    const verifyBtn = page.locator('button:has-text("Sign in")').last();
    if (await verifyBtn.isVisible()) {
      await verifyBtn.click();
      await page.waitForTimeout(1500);
    }
  }

  await page.goto('/doctor/chart/e0000000-0000-0000-0000-000000000001', {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(dir, `${mode}-doctor-chart.png`) });
});
