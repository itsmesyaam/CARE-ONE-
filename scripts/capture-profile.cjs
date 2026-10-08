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
    // 1. DESIGN REFERENCE: Profile Screen
    // ─────────────────────────────────────────────────────────────
    console.log('Capturing Design Reference Profile screenshots...');

    // 1A. Design Profile Desktop EN
    const refDesktop = await context.newPage({ viewport: { width: 1280, height: 800 } });
    await refDesktop.goto(refHtml, { waitUntil: 'load' });
    await refDesktop.waitForTimeout(400);
    await refDesktop.locator('button:has-text("Screens")').first().click();
    await refDesktop.waitForTimeout(200);
    await refDesktop.locator('button.pchip:has-text("Profile")').first().click();
    await refDesktop.waitForTimeout(400);
    await refDesktop.screenshot({ path: path.join(dir, 'patient-design-profile-desktop-en.png') });
    console.log('Saved patient-design-profile-desktop-en.png');

    // 1B. Design Profile Desktop ML
    await refDesktop.locator('button:has-text("Screens")').first().click();
    await refDesktop.waitForTimeout(200);
    await refDesktop.locator('.proto-panel button:has-text("മലയാളം")').first().click();
    await refDesktop.waitForTimeout(200);
    await refDesktop.locator('button.pchip:has-text("Profile")').first().click();
    await refDesktop.waitForTimeout(400);
    await refDesktop.screenshot({ path: path.join(dir, 'patient-design-profile-desktop-ml.png') });
    console.log('Saved patient-design-profile-desktop-ml.png');
    await refDesktop.close();

    // 1C. Design Profile Mobile EN
    const refMobile = await context.newPage();
    await refMobile.setViewportSize({ width: 390, height: 844 });
    await refMobile.goto(refHtml, { waitUntil: 'load' });
    await refMobile.waitForTimeout(400);
    await refMobile.locator('button:has-text("Screens")').first().click();
    await refMobile.waitForTimeout(300);
    const profilePchip = refMobile.locator('button.pchip:has-text("Profile")').first();
    await profilePchip.scrollIntoViewIfNeeded();
    await profilePchip.click();
    await refMobile.waitForTimeout(400);
    await refMobile.screenshot({ path: path.join(dir, 'patient-design-profile-mobile-en.png') });
    console.log('Saved patient-design-profile-mobile-en.png');

    // 1D. Design Profile Mobile ML
    await refMobile.locator('button:has-text("Screens")').first().click();
    await refMobile.waitForTimeout(300);
    const mlBtn = refMobile.locator('.proto-panel button:has-text("മലയാളം")').first();
    await mlBtn.scrollIntoViewIfNeeded();
    await mlBtn.click();
    await refMobile.waitForTimeout(200);
    const profilePchipMl = refMobile.locator('button.pchip:has-text("Profile")').first();
    await profilePchipMl.scrollIntoViewIfNeeded();
    await profilePchipMl.click();
    await refMobile.waitForTimeout(400);
    await refMobile.screenshot({ path: path.join(dir, 'patient-design-profile-mobile-ml.png') });
    console.log('Saved patient-design-profile-mobile-ml.png');
    await refMobile.close();

    // ─────────────────────────────────────────────────────────────
    // 2. IMPLEMENTED (AFTER): Profile Screen
    // ─────────────────────────────────────────────────────────────
    console.log('Capturing Implemented Profile screenshots...');
    const appPage = await context.newPage();

    // 2A. Profile Desktop EN
    await appPage.setViewportSize({ width: 1280, height: 800 });
    await appPage.goto('http://127.0.0.1:4173/patient/profile', { waitUntil: 'networkidle' });
    await appPage.evaluate(() => localStorage.setItem('careone_lang', 'en'));
    await appPage.reload({ waitUntil: 'networkidle' });
    await appPage.waitForTimeout(400);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-profile-desktop-en.png') });
    console.log('Saved patient-after-profile-desktop-en.png');

    // 2B. Profile Desktop ML
    await appPage.evaluate(() => localStorage.setItem('careone_lang', 'ml'));
    await appPage.reload({ waitUntil: 'networkidle' });
    await appPage.waitForTimeout(400);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-profile-desktop-ml.png') });
    console.log('Saved patient-after-profile-desktop-ml.png');

    // 2C. Profile Mobile ML
    await appPage.setViewportSize({ width: 390, height: 844 });
    await appPage.waitForTimeout(300);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-profile-mobile-ml.png') });
    console.log('Saved patient-after-profile-mobile-ml.png');

    // 2D. Profile Mobile EN
    await appPage.evaluate(() => localStorage.setItem('careone_lang', 'en'));
    await appPage.reload({ waitUntil: 'networkidle' });
    await appPage.waitForTimeout(400);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-profile-mobile-en.png') });
    console.log('Saved patient-after-profile-mobile-en.png');

    // 2E. Detailed State: Sign out confirmation modal (Desktop EN)
    await appPage.setViewportSize({ width: 1280, height: 800 });
    await appPage.reload({ waitUntil: 'networkidle' });
    await appPage.waitForTimeout(400);
    await appPage.locator('button:has-text("Sign out")').first().click();
    await appPage.waitForTimeout(300);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-profile-signout-modal.png') });
    console.log('Saved patient-after-profile-signout-modal.png');

    await browser.close();
    console.log('All Profile screenshots captured successfully.');
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
