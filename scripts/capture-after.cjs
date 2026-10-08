const { chromium } = require('@playwright/test');
const path = require('node:path');

async function main() {
  const browser = await chromium.launch();
  const dir = path.resolve(__dirname, '../docs/review/screenshots');
  const context = await browser.newContext();

  // 1. Home Desktop EN
  const page = await context.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(dir, 'after-home-desktop-en.png') });
  console.log('Saved after-home-desktop-en.png');

  // 2. Home Desktop ML
  await page.click('button[aria-label="Language"]');
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(dir, 'after-home-desktop-ml.png') });
  console.log('Saved after-home-desktop-ml.png');

  // Switch back to EN
  await page.click('button[aria-label="ഭാഷ"]');
  await page.waitForTimeout(250);

  // 3. Home Mobile EN
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(dir, 'after-home-mobile-en.png') });
  console.log('Saved after-home-mobile-en.png');

  // 4. Home Mobile ML
  await page.click('button[aria-label="Language"]');
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(dir, 'after-home-mobile-ml.png') });
  console.log('Saved after-home-mobile-ml.png');

  // Switch back to EN
  await page.click('button[aria-label="ഭാഷ"]');
  await page.waitForTimeout(250);

  // 5. Login Patient Desktop EN
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://127.0.0.1:4173/login', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(dir, 'after-login-patient-desktop-en.png') });
  console.log('Saved after-login-patient-desktop-en.png');

  // 6. Login Staff Desktop EN
  // The tab buttons are inside the segmented container
  const tabs = page.locator('div.mb-6.flex.rounded-full button');
  await tabs.nth(1).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(dir, 'after-login-staff-desktop-en.png') });
  console.log('Saved after-login-staff-desktop-en.png');

  // 7. Login Desktop ML
  await page.click('button[aria-label="Language"]');
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(dir, 'after-login-desktop-ml.png') });
  console.log('Saved after-login-desktop-ml.png');

  // Switch back to EN
  await page.click('button[aria-label="ഭാഷ"]');
  await page.waitForTimeout(250);

  // 8. Login Patient Mobile EN
  await page.setViewportSize({ width: 390, height: 844 });
  await tabs.nth(0).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(dir, 'after-login-patient-mobile-en.png') });
  console.log('Saved after-login-patient-mobile-en.png');

  // 9. Login Staff Mobile EN
  await tabs.nth(1).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(dir, 'after-login-staff-mobile-en.png') });
  console.log('Saved after-login-staff-mobile-en.png');

  // 10. Login Mobile ML
  await page.click('button[aria-label="Language"]');
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(dir, 'after-login-mobile-ml.png') });
  console.log('Saved after-login-mobile-ml.png');

  await browser.close();
  console.log('All screenshots captured successfully.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
