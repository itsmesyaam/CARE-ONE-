const { chromium } = require('@playwright/test');
const path = require('node:path');

async function main() {
  const browser = await chromium.launch();
  const dir = path.resolve(__dirname, '../docs/review/screenshots');

  const context = await browser.newContext();

  // 1. Home Desktop (1280x800)
  const page = await context.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(dir, 'local-preview-home-desktop.png') });
  console.log('Saved local-preview-home-desktop.png');

  // 2. Home Mobile (390x844)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(dir, 'local-preview-home-mobile.png') });
  console.log('Saved local-preview-home-mobile.png');

  // 3. Login Patient Tab Desktop
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://127.0.0.1:4173/login', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(dir, 'local-preview-login-patient-desktop.png') });
  console.log('Saved local-preview-login-patient-desktop.png');

  // 4. Login Staff Tab Desktop
  await page.click('button:has-text("Staff Sign-In")');
  await page.screenshot({ path: path.join(dir, 'local-preview-login-staff-desktop.png') });
  console.log('Saved local-preview-login-staff-desktop.png');

  // 5. Login Mobile (390x844)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(dir, 'local-preview-login-staff-mobile.png') });
  console.log('Saved local-preview-login-staff-mobile.png');

  // 6. Login Mobile Malayalam
  await page.click('button:has-text("മലയാളം")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(dir, 'local-preview-login-malayalam-mobile.png') });
  console.log('Saved local-preview-login-malayalam-mobile.png');

  // Switch back to English for admin test
  await page.click('button:has-text("English")');
  await page.waitForTimeout(200);

  // 7. Admin Guard Screen Desktop
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://127.0.0.1:4173/admin', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(dir, 'local-preview-admin-guard-desktop.png') });
  console.log('Saved local-preview-admin-guard-desktop.png');

  // 8. Admin Guard Screen Mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(dir, 'local-preview-admin-guard-mobile.png') });
  console.log('Saved local-preview-admin-guard-mobile.png');

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
