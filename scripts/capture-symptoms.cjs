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
    // 1. DESIGN REFERENCE: Report a Symptom Sheet
    // ─────────────────────────────────────────────────────────────
    console.log('Capturing Design Reference Symptom Sheet screenshots...');

    // 1A. Design Symptom Desktop EN
    const refDesktop = await context.newPage({ viewport: { width: 1280, height: 800 } });
    await refDesktop.goto(refHtml, { waitUntil: 'load' });
    await refDesktop.waitForTimeout(400);
    await refDesktop.locator('button:has-text("Screens")').first().click();
    await refDesktop.waitForTimeout(200);
    await refDesktop.locator('button.pchip:has-text("Symptom form")').first().click();
    await refDesktop.waitForTimeout(400);
    await refDesktop.screenshot({ path: path.join(dir, 'patient-design-symptom-desktop-en.png') });
    console.log('Saved patient-design-symptom-desktop-en.png');

    // 1B. Design Symptom Desktop ML
    await refDesktop.locator('button:has-text("Screens")').first().click();
    await refDesktop.waitForTimeout(200);
    await refDesktop.locator('.proto-panel button:has-text("മലയാളം")').first().click();
    await refDesktop.waitForTimeout(200);
    await refDesktop.locator('button.pchip:has-text("Symptom form")').first().click();
    await refDesktop.waitForTimeout(400);
    await refDesktop.screenshot({ path: path.join(dir, 'patient-design-symptom-desktop-ml.png') });
    console.log('Saved patient-design-reading-desktop-ml.png -> patient-design-symptom-desktop-ml.png');
    await refDesktop.close();

    // 1C. Design Symptom Mobile EN
    const refMobile = await context.newPage();
    await refMobile.setViewportSize({ width: 390, height: 844 });
    await refMobile.goto(refHtml, { waitUntil: 'load' });
    await refMobile.waitForTimeout(400);
    await refMobile.locator('button:has-text("Screens")').first().click();
    await refMobile.waitForTimeout(300);
    const symptomPchip = refMobile.locator('button.pchip:has-text("Symptom form")').first();
    await symptomPchip.scrollIntoViewIfNeeded();
    await symptomPchip.click();
    await refMobile.waitForTimeout(400);
    await refMobile.screenshot({ path: path.join(dir, 'patient-design-symptom-mobile-en.png') });
    console.log('Saved patient-design-symptom-mobile-en.png');

    // 1D. Design Symptom Mobile ML
    await refMobile.locator('button:has-text("Screens")').first().click();
    await refMobile.waitForTimeout(300);
    const mlBtn = refMobile.locator('.proto-panel button:has-text("മലയാളം")').first();
    await mlBtn.scrollIntoViewIfNeeded();
    await mlBtn.click();
    await refMobile.waitForTimeout(200);
    const symptomPchipMl = refMobile.locator('button.pchip:has-text("Symptom form")').first();
    await symptomPchipMl.scrollIntoViewIfNeeded();
    await symptomPchipMl.click();
    await refMobile.waitForTimeout(400);
    await refMobile.screenshot({ path: path.join(dir, 'patient-design-symptom-mobile-ml.png') });
    console.log('Saved patient-design-symptom-mobile-ml.png');
    await refMobile.close();

    // ─────────────────────────────────────────────────────────────
    // 2. IMPLEMENTED (AFTER): Report a Symptom Sheet
    // ─────────────────────────────────────────────────────────────
    console.log('Capturing Implemented Symptom Sheet screenshots...');
    const appPage = await context.newPage();

    // 2A. Symptom Sheet Desktop EN
    await appPage.setViewportSize({ width: 1280, height: 800 });
    await appPage.goto('http://127.0.0.1:4173/patient/records', { waitUntil: 'networkidle' });
    await appPage.evaluate(() => localStorage.setItem('careone_lang', 'en'));
    await appPage.reload({ waitUntil: 'networkidle' });
    await appPage.waitForTimeout(400);
    // Switch to summary tab and click Report symptom
    await appPage.locator('button:has-text("Health summary")').first().click();
    await appPage.waitForTimeout(300);
    await appPage.locator('button:has-text("Report symptom")').first().click();
    await appPage.waitForTimeout(400);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-symptom-desktop-en.png') });
    console.log('Saved patient-after-symptom-desktop-en.png');

    // 2B. Symptom Sheet Desktop ML
    await appPage.locator('.sheet button[aria-label="Close"]').first().click().catch(() => {});
    await appPage.waitForTimeout(200);
    await appPage.evaluate(() => localStorage.setItem('careone_lang', 'ml'));
    await appPage.reload({ waitUntil: 'networkidle' });
    await appPage.waitForTimeout(400);
    await appPage.locator('button:has-text("ആരോഗ്യ സംഗ്രഹം")').first().click();
    await appPage.waitForTimeout(300);
    await appPage.locator('button:has-text("ലക്ഷണം ചേർക്കുക")').first().click();
    await appPage.waitForTimeout(400);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-symptom-desktop-ml.png') });
    console.log('Saved patient-after-symptom-desktop-ml.png');

    // 2C. Symptom Sheet Mobile ML
    await appPage.setViewportSize({ width: 390, height: 844 });
    await appPage.waitForTimeout(300);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-symptom-mobile-ml.png') });
    console.log('Saved patient-after-symptom-mobile-ml.png');

    // 2D. Symptom Sheet Mobile EN
    await appPage.locator('.sheet button[aria-label="Close"]').first().click().catch(() => {});
    await appPage.waitForTimeout(200);
    await appPage.evaluate(() => localStorage.setItem('careone_lang', 'en'));
    await appPage.reload({ waitUntil: 'networkidle' });
    await appPage.waitForTimeout(400);
    // In mobile, click middle FAB -> open Add menu -> click Report a symptom
    await appPage.locator('button.fab').first().click();
    await appPage.waitForTimeout(300);
    await appPage.locator('.sheet button:has-text("Report a symptom")').first().click();
    await appPage.waitForTimeout(400);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-symptom-mobile-en.png') });
    console.log('Saved patient-after-symptom-mobile-en.png');

    // 2E. Detailed State: Red-Flag Alert with Chest Pain (Desktop EN)
    await appPage.setViewportSize({ width: 1280, height: 800 });
    await appPage.locator('.sheet button:has-text("Chest pain")').first().click();
    await appPage.waitForTimeout(200);
    await appPage.locator('.sheet #sx').fill('Sudden tightness in chest since afternoon');
    await appPage.waitForTimeout(200);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-symptom-redflag-modal.png') });
    console.log('Saved patient-after-symptom-redflag-modal.png');

    await browser.close();
    console.log('All Report a Symptom Sheet screenshots captured successfully.');
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
