const { chromium } = require('@playwright/test');
const path = require('node:path');

async function main() {
  const browser = await chromium.launch();
  const dir = path.resolve(__dirname, '../docs/review/screenshots');
  const context = await browser.newContext();
  const consoleErrors = [];

  const page = await context.newPage({ viewport: { width: 1280, height: 800 } });

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // 1. Live Home Desktop (1280x800)
  console.log('--- NAVIGATING TO LIVE HOME DESKTOP ---');
  await page.goto('https://care-one-h7mc.vercel.app', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(dir, 'live-6219374-home-desktop.png') });
  console.log('Saved live-6219374-home-desktop.png');

  // Verify build stamp in DOM
  const stampText = await page.locator('[data-testid="build-stamp"]').innerText();
  console.log('Build Stamp Text on Home:', stampText);

  // 2. Live Home Mobile (390x844)
  console.log('--- NAVIGATING TO LIVE HOME MOBILE ---');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(dir, 'live-6219374-home-mobile.png') });
  console.log('Saved live-6219374-home-mobile.png');

  // 3. Live Login Desktop (1280x800)
  console.log('--- NAVIGATING TO LIVE LOGIN DESKTOP ---');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('https://care-one-h7mc.vercel.app/login', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(dir, 'live-6219374-login-desktop.png') });
  console.log('Saved live-6219374-login-desktop.png');

  const stampLogin = await page.locator('[data-testid="build-stamp"]').innerText();
  console.log('Build Stamp Text on Login:', stampLogin);

  // 4. Live Login Mobile (390x844)
  console.log('--- NAVIGATING TO LIVE LOGIN MOBILE ---');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(dir, 'live-6219374-login-mobile.png') });
  console.log('Saved live-6219374-login-mobile.png');

  // 5. Live Login Staff Tab Mobile
  await page.click('button:has-text("Staff Sign-In")');
  await page.screenshot({ path: path.join(dir, 'live-6219374-login-staff-mobile.png') });
  console.log('Saved live-6219374-login-staff-mobile.png');

  // 6. Live Login Mobile Malayalam
  await page.click('button:has-text("മലയാളം")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(dir, 'live-6219374-login-malayalam-mobile.png') });
  console.log('Saved live-6219374-login-malayalam-mobile.png');

  console.log('=== CONSOLE ERRORS ===');
  console.log(JSON.stringify(consoleErrors, null, 2));

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
