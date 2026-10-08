const { chromium } = require('@playwright/test');
const path = require('node:path');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const refHtml = 'file:///' + path.resolve(__dirname, '../design/patient/reference/index.html').replace(/\\/g, '/');
  await page.goto(refHtml, { waitUntil: 'load' });
  await page.waitForTimeout(500);

  // Click Screens button
  await page.locator('button:has-text("Screens")').first().click();
  await page.waitForTimeout(200);

  // Click Home chip
  await page.locator('button.pchip:has-text("Home")').first().click();
  await page.waitForTimeout(500);

  const outPath = path.resolve(__dirname, '../docs/review/screenshots/patient-design-home-desktop-en.png');
  await page.screenshot({ path: outPath });
  console.log('Saved patient-design-home-desktop-en.png, size:', fs.statSync(outPath).size);

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
