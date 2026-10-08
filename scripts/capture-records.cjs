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
    // 1. DESIGN REFERENCE: Records & Reports
    // ─────────────────────────────────────────────────────────────
    console.log('Capturing Design Reference Records & Reports screenshots...');

    // 1A. Design Records Desktop EN
    const refDesktop = await context.newPage({ viewport: { width: 1280, height: 800 } });
    await refDesktop.goto(refHtml, { waitUntil: 'load' });
    await refDesktop.waitForTimeout(400);
    await refDesktop.locator('button:has-text("Screens")').first().click();
    await refDesktop.waitForTimeout(200);
    await refDesktop.locator('button.pchip:has-text("Reports")').first().click();
    await refDesktop.waitForTimeout(400);
    await refDesktop.screenshot({ path: path.join(dir, 'patient-design-records-desktop-en.png') });
    console.log('Saved patient-design-records-desktop-en.png');

    // 1B. Design Records Desktop ML
    await refDesktop.locator('button:has-text("Screens")').first().click();
    await refDesktop.waitForTimeout(200);
    await refDesktop.locator('.proto-panel button:has-text("മലയാളം")').first().click();
    await refDesktop.waitForTimeout(200);
    await refDesktop.locator('.proto-panel button[aria-label="Close"]').first().click().catch(() => {});
    await refDesktop.waitForTimeout(300);
    await refDesktop.screenshot({ path: path.join(dir, 'patient-design-records-desktop-ml.png') });
    console.log('Saved patient-design-records-desktop-ml.png');
    await refDesktop.close();

    // 1C. Design Records Mobile EN
    const refMobile = await context.newPage();
    await refMobile.setViewportSize({ width: 390, height: 844 });
    await refMobile.goto(refHtml, { waitUntil: 'load' });
    await refMobile.waitForTimeout(400);
    await refMobile.locator('button:has-text("Screens")').first().click();
    await refMobile.waitForTimeout(200);
    await refMobile.locator('button.pchip:has-text("Reports")').first().click();
    await refMobile.waitForTimeout(400);
    await refMobile.screenshot({ path: path.join(dir, 'patient-design-records-mobile-en.png') });
    console.log('Saved patient-design-records-mobile-en.png');

    // 1D. Design Records Mobile ML
    await refMobile.locator('button:has-text("Screens")').first().click();
    await refMobile.waitForTimeout(200);
    await refMobile.locator('.proto-panel button:has-text("മലയാളം")').first().click();
    await refMobile.waitForTimeout(200);
    await refMobile.locator('.proto-panel button[aria-label="Close"]').first().click().catch(() => {});
    await refMobile.waitForTimeout(300);
    await refMobile.screenshot({ path: path.join(dir, 'patient-design-records-mobile-ml.png') });
    console.log('Saved patient-design-records-mobile-ml.png');
    await refMobile.close();

    // ─────────────────────────────────────────────────────────────
    // 2. IMPLEMENTED (AFTER): Records & Reports
    // ─────────────────────────────────────────────────────────────
    console.log('Capturing Implemented Records & Reports screenshots...');
    const appPage = await context.newPage();
    await appPage.setViewportSize({ width: 1280, height: 800 });

    // 2A. Records Desktop EN
    await appPage.goto('http://127.0.0.1:4173/patient/records', { waitUntil: 'networkidle' });
    await appPage.evaluate(() => localStorage.setItem('careone_lang', 'en'));
    await appPage.reload({ waitUntil: 'networkidle' });
    await appPage.waitForTimeout(400);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-records-desktop-en.png') });
    console.log('Saved patient-after-records-desktop-en.png');

    // 2B. Records Desktop ML
    await appPage.evaluate(() => localStorage.setItem('careone_lang', 'ml'));
    await appPage.reload({ waitUntil: 'networkidle' });
    await appPage.waitForTimeout(400);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-records-desktop-ml.png') });
    console.log('Saved patient-after-records-desktop-ml.png');

    // 2C. Records Mobile ML
    await appPage.setViewportSize({ width: 390, height: 844 });
    await appPage.waitForTimeout(300);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-records-mobile-ml.png') });
    console.log('Saved patient-after-records-mobile-ml.png');

    // 2D. Records Mobile EN
    await appPage.evaluate(() => localStorage.setItem('careone_lang', 'en'));
    await appPage.reload({ waitUntil: 'networkidle' });
    await appPage.waitForTimeout(400);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-records-mobile-en.png') });
    console.log('Saved patient-after-records-mobile-en.png');

    // 2E. Report Viewer Modal (Desktop)
    await appPage.setViewportSize({ width: 1280, height: 800 });
    await appPage.goto('http://127.0.0.1:4173/patient/records', { waitUntil: 'networkidle' });
    await appPage.waitForTimeout(300);
    await appPage.locator('button:has-text("HbA1c and fasting glucose")').first().click();
    await appPage.waitForTimeout(400);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-records-report-modal.png') });
    console.log('Saved patient-after-records-report-modal.png');

    // 2F. Upload Report Modal (Desktop)
    await appPage.locator('button[aria-label="Close"]').first().click().catch(() => {});
    await appPage.waitForTimeout(200);
    await appPage.locator('button:has-text("Upload")').first().click();
    await appPage.waitForTimeout(400);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-records-upload-modal.png') });
    console.log('Saved patient-after-records-upload-modal.png');

    await browser.close();
    console.log('All Records and Reports screenshots captured successfully.');
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
