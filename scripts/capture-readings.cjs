const { chromium } = require('@playwright/test');
const { spawn } = require('child_process');
const http = require('http');
const path = require('node:path');

function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function probe() {
      http.get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve();
        } else {
          checkTimeout();
        }
      }).on('error', () => {
        checkTimeout();
      });
    }
    function checkTimeout() {
      if (Date.now() - start > timeoutMs) {
        reject(new Error('Timeout waiting for preview server at ' + url));
      } else {
        setTimeout(probe, 250);
      }
    }
    probe();
  });
}

async function main() {
  const dir = path.resolve(__dirname, '../docs/review/screenshots');
  const refHtml = 'file:///' + path.resolve(__dirname, '../design/patient/reference/index.html').replace(/\\/g, '/');

  console.log('Starting preview server on port 4173...');
  const previewProcess = spawn('npx.cmd vite preview --host 127.0.0.1 --port 4173', { shell: true });

  try {
    await waitForServer('http://127.0.0.1:4173');
    console.log('Preview server ready.');

    const browser = await chromium.launch();
    const context = await browser.newContext();

    // ─────────────────────────────────────────────────────────────
    // 1. DESIGN REFERENCE: Log a Reading Sheet
    // ─────────────────────────────────────────────────────────────
    console.log('Capturing Design Reference Reading Sheet screenshots...');

    // 1A. Design Reading Desktop EN
    const refDesktop = await context.newPage({ viewport: { width: 1280, height: 800 } });
    await refDesktop.goto(refHtml, { waitUntil: 'load' });
    await refDesktop.waitForTimeout(400);
    await refDesktop.locator('button:has-text("Screens")').first().click();
    await refDesktop.waitForTimeout(200);
    await refDesktop.locator('button.pchip:has-text("Log a reading")').first().click();
    await refDesktop.waitForTimeout(400);
    await refDesktop.screenshot({ path: path.join(dir, 'patient-design-reading-desktop-en.png') });
    console.log('Saved patient-design-reading-desktop-en.png');

    // 1B. Design Reading Desktop ML
    await refDesktop.locator('button:has-text("Screens")').first().click();
    await refDesktop.waitForTimeout(200);
    await refDesktop.locator('.proto-panel button:has-text("മലയാളം")').first().click();
    await refDesktop.waitForTimeout(200);
    await refDesktop.locator('button.pchip:has-text("Log a reading")').first().click();
    await refDesktop.waitForTimeout(400);
    await refDesktop.screenshot({ path: path.join(dir, 'patient-design-reading-desktop-ml.png') });
    console.log('Saved patient-design-reading-desktop-ml.png');
    await refDesktop.close();

    // 1C. Design Reading Mobile EN
    const refMobile = await context.newPage();
    await refMobile.setViewportSize({ width: 390, height: 844 });
    await refMobile.goto(refHtml, { waitUntil: 'load' });
    await refMobile.waitForTimeout(400);
    await refMobile.locator('button:has-text("Screens")').first().click();
    await refMobile.waitForTimeout(300);
    const readingPchip = refMobile.locator('button.pchip:has-text("Log a reading")').first();
    await readingPchip.scrollIntoViewIfNeeded();
    await readingPchip.click();
    await refMobile.waitForTimeout(400);
    await refMobile.screenshot({ path: path.join(dir, 'patient-design-reading-mobile-en.png') });
    console.log('Saved patient-design-reading-mobile-en.png');

    // 1D. Design Reading Mobile ML
    await refMobile.locator('button:has-text("Screens")').first().click();
    await refMobile.waitForTimeout(300);
    const mlBtn = refMobile.locator('.proto-panel button:has-text("മലയാളം")').first();
    await mlBtn.scrollIntoViewIfNeeded();
    await mlBtn.click();
    await refMobile.waitForTimeout(200);
    const readingPchipMl = refMobile.locator('button.pchip:has-text("Log a reading")').first();
    await readingPchipMl.scrollIntoViewIfNeeded();
    await readingPchipMl.click();
    await refMobile.waitForTimeout(400);
    await refMobile.screenshot({ path: path.join(dir, 'patient-design-reading-mobile-ml.png') });
    console.log('Saved patient-design-reading-mobile-ml.png');
    await refMobile.close();

    // ─────────────────────────────────────────────────────────────
    // 2. IMPLEMENTED (AFTER): Log a Reading Sheet
    // ─────────────────────────────────────────────────────────────
    console.log('Capturing Implemented Reading Sheet screenshots...');
    const appPage = await context.newPage();

    // 2A. Reading Sheet Desktop EN
    await appPage.setViewportSize({ width: 1280, height: 800 });
    await appPage.goto('http://127.0.0.1:4173/patient', { waitUntil: 'networkidle' });
    await appPage.evaluate(() => localStorage.setItem('careone_lang', 'en'));
    await appPage.reload({ waitUntil: 'networkidle' });
    await appPage.waitForTimeout(400);
    await appPage.locator('button.tile-add').first().click();
    await appPage.waitForTimeout(400);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-reading-desktop-en.png') });
    console.log('Saved patient-after-reading-desktop-en.png');

    // 2B. Reading Sheet Desktop ML
    await appPage.locator('button[aria-label="Close"]').first().click().catch(() => {});
    await appPage.waitForTimeout(200);
    await appPage.evaluate(() => localStorage.setItem('careone_lang', 'ml'));
    await appPage.reload({ waitUntil: 'networkidle' });
    await appPage.waitForTimeout(400);
    await appPage.locator('button.tile-add').first().click();
    await appPage.waitForTimeout(400);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-reading-desktop-ml.png') });
    console.log('Saved patient-after-reading-desktop-ml.png');

    // 2C. Reading Sheet Mobile ML
    await appPage.setViewportSize({ width: 390, height: 844 });
    await appPage.waitForTimeout(300);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-reading-mobile-ml.png') });
    console.log('Saved patient-after-reading-mobile-ml.png');

    // 2D. Reading Sheet Mobile EN
    await appPage.locator('button[aria-label="Close"]').first().click().catch(() => {});
    await appPage.waitForTimeout(200);
    await appPage.evaluate(() => localStorage.setItem('careone_lang', 'en'));
    await appPage.reload({ waitUntil: 'networkidle' });
    await appPage.waitForTimeout(400);
    await appPage.locator('button.tile-add').first().click();
    await appPage.waitForTimeout(400);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-reading-mobile-en.png') });
    console.log('Saved patient-after-reading-mobile-en.png');

    // 2E. Detailed Modal: Sugar with meal chips (Desktop EN)
    await appPage.setViewportSize({ width: 1280, height: 800 });
    await appPage.locator('.sheet button:has-text("Blood sugar")').first().click();
    await appPage.waitForTimeout(300);
    await appPage.locator('.sheet #sg').fill('145');
    await appPage.locator('.sheet button:has-text("2 hrs after food")').first().click();
    await appPage.waitForTimeout(300);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-reading-sugar-modal.png') });
    console.log('Saved patient-after-reading-sugar-modal.png');

    // 2F. Detailed Modal: High BP Out of Range Warning (Desktop EN)
    await appPage.locator('.sheet button:has-text("Blood pressure")').first().click();
    await appPage.waitForTimeout(300);
    await appPage.locator('.sheet #sys').fill('152');
    await appPage.locator('.sheet #dia').fill('96');
    await appPage.locator('.sheet #pul').fill('78');
    await appPage.waitForTimeout(300);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-reading-warning-modal.png') });
    console.log('Saved patient-after-reading-warning-modal.png');

    await browser.close();
    console.log('All Log a Reading Sheet screenshots captured successfully.');
  } finally {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', previewProcess.pid.toString(), '/f', '/t'], { shell: true });
      } else {
        previewProcess.kill();
      }
    } catch {
      // ignore
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
