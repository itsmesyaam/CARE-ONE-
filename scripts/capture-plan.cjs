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
    // 1. DESIGN REFERENCE: Care Plan
    // ─────────────────────────────────────────────────────────────
    console.log('Capturing Design Reference Care Plan screenshots...');

    // 1A. Design Care Plan Desktop EN
    const refDesktop = await context.newPage({ viewport: { width: 1280, height: 800 } });
    await refDesktop.goto(refHtml, { waitUntil: 'load' });
    await refDesktop.waitForTimeout(400);
    await refDesktop.locator('button:has-text("Screens")').first().click();
    await refDesktop.waitForTimeout(200);
    await refDesktop.locator('button.pchip:has-text("Care plan")').first().click();
    await refDesktop.waitForTimeout(400);
    await refDesktop.screenshot({ path: path.join(dir, 'patient-design-plan-desktop-en.png') });
    console.log('Saved patient-design-plan-desktop-en.png');

    // 1B. Design Care Plan Desktop ML
    await refDesktop.locator('button:has-text("Screens")').first().click();
    await refDesktop.waitForTimeout(200);
    await refDesktop.locator('.proto-panel button:has-text("മലയാളം")').first().click();
    await refDesktop.waitForTimeout(200);
    await refDesktop.locator('.proto-panel button[aria-label="Close"]').first().click().catch(() => {});
    await refDesktop.waitForTimeout(300);
    await refDesktop.screenshot({ path: path.join(dir, 'patient-design-plan-desktop-ml.png') });
    console.log('Saved patient-design-plan-desktop-ml.png');
    await refDesktop.close();

    // 1C. Design Care Plan Mobile EN
    const refMobile = await context.newPage({ viewport: { width: 390, height: 844 } });
    await refMobile.goto(refHtml, { waitUntil: 'load' });
    await refMobile.waitForTimeout(400);
    await refMobile.locator('button:has-text("Screens")').first().click();
    await refMobile.waitForTimeout(200);
    await refMobile.locator('button.pchip:has-text("Care plan")').first().click();
    await refMobile.waitForTimeout(400);
    await refMobile.screenshot({ path: path.join(dir, 'patient-design-plan-mobile-en.png') });
    console.log('Saved patient-design-plan-mobile-en.png');

    // 1D. Design Care Plan Mobile ML
    await refMobile.locator('button:has-text("Screens")').first().click();
    await refMobile.waitForTimeout(200);
    await refMobile.locator('.proto-panel button:has-text("മലയാളം")').first().click();
    await refMobile.waitForTimeout(200);
    await refMobile.locator('.proto-panel button[aria-label="Close"]').first().click().catch(() => {});
    await refMobile.waitForTimeout(300);
    await refMobile.screenshot({ path: path.join(dir, 'patient-design-plan-mobile-ml.png') });
    console.log('Saved patient-design-plan-mobile-ml.png');
    await refMobile.close();

    // ─────────────────────────────────────────────────────────────
    // 2. IMPLEMENTED (AFTER): Care Plan
    // ─────────────────────────────────────────────────────────────
    console.log('Capturing Implemented Care Plan screenshots...');
    const appPage = await context.newPage({ viewport: { width: 1280, height: 800 } });

    // 2A. Care Plan Desktop EN
    await appPage.goto('http://127.0.0.1:4173/patient/login', { waitUntil: 'networkidle' });
    const enBtn = appPage.locator('button:has-text("English"), button:has-text("EN")').first();
    if (await enBtn.isVisible()) await enBtn.click();
    await appPage.waitForTimeout(200);
    await appPage.goto('http://127.0.0.1:4173/patient/plan', { waitUntil: 'networkidle' });
    await appPage.waitForTimeout(400);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-plan-desktop-en.png') });
    console.log('Saved patient-after-plan-desktop-en.png');

    // 2B. Care Plan Desktop ML
    await appPage.goto('http://127.0.0.1:4173/patient/login', { waitUntil: 'networkidle' });
    await appPage.locator('button:has-text("മലയാളം")').first().click();
    await appPage.waitForTimeout(200);
    await appPage.goto('http://127.0.0.1:4173/patient/plan', { waitUntil: 'networkidle' });
    await appPage.waitForTimeout(400);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-plan-desktop-ml.png') });
    console.log('Saved patient-after-plan-desktop-ml.png');

    // 2C. Care Plan Mobile ML
    await appPage.setViewportSize({ width: 390, height: 844 });
    await appPage.waitForTimeout(300);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-plan-mobile-ml.png') });
    console.log('Saved patient-after-plan-mobile-ml.png');

    // 2D. Care Plan Mobile EN
    await appPage.goto('http://127.0.0.1:4173/patient/login', { waitUntil: 'networkidle' });
    await appPage.locator('button:has-text("English"), button:has-text("EN")').first().click();
    await appPage.waitForTimeout(200);
    await appPage.goto('http://127.0.0.1:4173/patient/plan', { waitUntil: 'networkidle' });
    await appPage.setViewportSize({ width: 390, height: 844 });
    await appPage.waitForTimeout(300);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-plan-mobile-en.png') });
    console.log('Saved patient-after-plan-mobile-en.png');

    await browser.close();
    console.log('All Care Plan screenshots captured successfully.');
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
