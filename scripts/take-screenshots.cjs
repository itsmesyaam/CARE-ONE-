const { chromium } = require('@playwright/test');
const path = require('node:path');

async function run() {
  const browser = await chromium.launch();
  const screenshotDir = path.resolve(__dirname, '../docs/review/screenshots');

  // 1. Desktop Home
  const pageDesktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await pageDesktop.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await pageDesktop.screenshot({ path: path.join(screenshotDir, 'local-home-desktop.png') });
  console.log('Saved local-home-desktop.png');

  // 2. Mobile Home
  const pageMobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await pageMobile.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await pageMobile.screenshot({ path: path.join(screenshotDir, 'local-home-mobile.png') });
  console.log('Saved local-home-mobile.png');

  // 3. Desktop Login (Patient Tab)
  await pageDesktop.goto('http://127.0.0.1:4173/login', { waitUntil: 'networkidle' });
  await pageDesktop.screenshot({ path: path.join(screenshotDir, 'local-login-patient-desktop.png') });
  console.log('Saved local-login-patient-desktop.png');

  // 4. Desktop Login (Staff Tab)
  await pageDesktop.click('button:has-text("Staff Sign-In")');
  await pageDesktop.screenshot({ path: path.join(screenshotDir, 'local-login-staff-desktop.png') });
  console.log('Saved local-login-staff-desktop.png');

  // 5. Mobile Login (Phone 390px)
  await pageMobile.goto('http://127.0.0.1:4173/login', { waitUntil: 'networkidle' });
  await pageMobile.screenshot({ path: path.join(screenshotDir, 'local-login-patient-mobile.png') });
  console.log('Saved local-login-patient-mobile.png');

  // 6. Mobile Login with Malayalam switch
  await pageMobile.click('button:has-text("മലയാളം")');
  await pageMobile.waitForTimeout(300);
  await pageMobile.screenshot({ path: path.join(screenshotDir, 'local-login-malayalam-mobile.png') });
  console.log('Saved local-login-malayalam-mobile.png');

  const heading = await pageMobile.locator('h1').innerText();
  console.log('Malayalam Heading:', heading);

  await browser.close();
}

run().catch(err => {
  console.error('Screenshot script failed:', err);
  process.exit(1);
});
